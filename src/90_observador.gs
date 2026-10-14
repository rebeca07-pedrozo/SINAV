/**
 * 90_observador.gs — Fase 0. SOLO LECTURA sobre el buzón.
 * No etiqueta, no archiva, no marca como leído, no manda nada. Solo escribe en MUESTRAS.
 * Sirve para (1) medir qué % responde sobre el hilo original y (2) recoger muestras reales
 * de cómo responde revisoría. No inventa reglas de clasificación (BRIEF §6).
 */

const OBS_MAX_HILOS = 50;
const OBS_MAX_MS = 4.5 * 60 * 1000;   // margen bajo el límite de 6 min
const OBS_MAX_CUERPO = 45000;         // una celda admite 50.000 caracteres

function observar() {
  const inicio = Date.now();
  const alias = configOpcional('alias_envio').toLowerCase();
  if (!alias) { Logger.log('observar(): alias_envio vacío en CONFIG; no hay forma de saber qué es respuesta a un envío.'); }

  const vistos = mensajesYaRegistrados();
  const nuevas = [];

  GmailApp.search(consultaObservador(), 0, OBS_MAX_HILOS).forEach(function (hilo) {
    if (Date.now() - inicio > OBS_MAX_MS) return;
    const mensajes = hilo.getMessages();
    let hayEnvioNuestro = false;
    mensajes.forEach(function (m) {
      const esNuestro = alias && m.getFrom().toLowerCase().indexOf(alias) !== -1;
      const id = m.getId();
      if (!vistos[id]) {
        const adj = m.getAttachments({ includeInlineImages: false });
        nuevas.push({
          thread_id: hilo.getId(),
          message_id: id,
          remitente: m.getFrom(),
          asunto: m.getSubject(),
          fecha: m.getDate(),
          es_respuesta_a_envio: hayEnvioNuestro && !esNuestro,
          tiene_adjunto: adj.length > 0,
          tipos_adjunto: adj.map(function (a) { return a.getContentType(); }).join(', '),
          cuerpo_texto: m.getPlainBody().substring(0, OBS_MAX_CUERPO)
        });
      }
      if (esNuestro) hayEnvioNuestro = true;
    });
  });

  agregarFilas(HOJAS.MUESTRAS, nuevas);
  Logger.log('observar(): ' + nuevas.length + ' mensajes nuevos en MUESTRAS.');
}

/** Consulta acotada (BRIEF §11): ventana corta, nunca toda la bandeja. */
function consultaObservador() {
  const etiqueta = configOpcional('etiqueta_respuestas');
  // TODO(USUARIO): 2 días es una ventana que elegí yo; si el observador falla un fin de
  // semana largo, amplíala temporalmente.
  const ventana = 'newer_than:2d';
  return etiqueta
    ? '(in:inbox OR label:"' + etiqueta.replace(/"/g, '') + '") ' + ventana
    : 'in:inbox ' + ventana;
}

function mensajesYaRegistrados() {
  const hoja = hojaDe(HOJAS.MUESTRAS);
  const n = hoja.getLastRow() - 1;
  const mapa = {};
  if (n < 1) return mapa;
  const col = ENCABEZADOS.MUESTRAS.indexOf('message_id') + 1;
  hoja.getRange(2, col, n, 1).getValues().forEach(function (f) { mapa[f[0]] = true; });
  return mapa;
}

/** Crea el trigger de cada 5 minutos (idempotente). Corre esto una vez, a mano. */
function activarObservador() {
  const ya = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'observar'; });
  if (ya) { Logger.log('El observador ya estaba activo.'); return; }
  ScriptApp.newTrigger('observar').timeBased().everyMinutes(5).create();
  Logger.log('Observador activado: cada 5 minutos.');
}

function desactivarObservador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'observar') ScriptApp.deleteTrigger(t);
  });
  Logger.log('Observador desactivado.');
}
