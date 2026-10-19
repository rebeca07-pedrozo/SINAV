/**
 * Respuestas.gs — pestaña RESPUESTAS y el trigger que lee el buzón.
 */

// ---------- Leer el buzón ----------

/** Trigger cada 10 minutos. Si hay un envío en curso, simplemente espera a la próxima. */
function revisarRespuestas() {
  try {
    return conLock(function () { return revisarInterno(Date.now()); });
  } catch (e) {
    if (/otra operación/.test(e.message)) return { ocupado: true };
    throw e;
  }
}

/** Botón "Revisar ahora" de la interfaz. */
function revisarAhora() {
  const r = revisarRespuestas();
  if (r && r.ocupado) throw new Error('Hay un envío en curso. Intenta de nuevo en un minuto.');
  return r;
}

function direcciones(texto) {
  return (String(texto || '').match(/[A-Za-z0-9._%+\-']+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g) || []).map(function (s) { return s.toLowerCase(); });
}

function revisarInterno(inicio) {
  const cfg = leerConfig();
  const resumen = { revisadas: 0, respondidas: 0, sinAdjunto: 0, rebotes: 0 };
  if (!cfg.carpeta_sellados) return { error: 'Falta la propiedad del script carpeta_sellados.' };

  const esperando = leerObligaciones().filter(function (o) { return o.estado === 'ENVIADA' && o.hilo; });
  resumen.revisadas = esperando.length;
  guardarMarca('ultima_revision');
  if (!esperando.length) return resumen;

  const porHilo = {};
  let masVieja = new Date();
  esperando.forEach(function (o) {
    porHilo[o.hilo] = o;
    if (o.fecha_envio instanceof Date && o.fecha_envio < masVieja) masVieja = o.fecha_envio;
  });
  const dias = Math.min(120, Math.max(2, Math.ceil((Date.now() - masVieja.getTime()) / 86400000) + 1));

  const propios = {};
  [Session.getEffectiveUser().getEmail(), cfg.correo_remitente, cfg.responder_a].concat(GmailApp.getAliases())
    .forEach(function (c) { direcciones(c).forEach(function (d) { propios[d] = true; }); });

  const eventos = [];
  const carpeta = DriveApp.getFolderById(cfg.carpeta_sellados);
  try {
    // Hilos de los últimos N días con algún mensaje que no es mío (en PRUEBA vale cualquiera).
    for (let desde = 0; desde < 2000; desde += 500) {
      const hilos = GmailApp.search('in:anywhere newer_than:' + dias + 'd' + (cfg.esPrueba ? '' : ' -from:me'), desde, 500);
      for (let i = 0; i < hilos.length; i++) {
        if (Date.now() - inicio > TIEMPO_MAX_MS) return resumen;
        const o = porHilo[hilos[i].getId()];
        if (o && o.estado === 'ENVIADA') {
          try { procesarHilo(o, hilos[i], cfg, propios, carpeta, eventos, resumen); }
          catch (e) { eventos.push([etiqueta(o), 'ERROR', 'Al leer la respuesta: ' + e.message]); }
        }
      }
      if (hilos.length < 500) break;
    }
  } finally {
    registrarEventos(eventos);
  }
  return resumen;
}

function procesarHilo(o, hilo, cfg, propios, carpeta, eventos, resumen) {
  const corte = (o.fecha_respuesta instanceof Date ? o.fecha_respuesta : o.fecha_envio) || new Date(0);
  const todos = hilo.getMessages();
  let nuevos = todos.filter(function (m) { return m.getDate().getTime() > corte.getTime() + 1000; });
  if (cfg.esPrueba) {
    // En PRUEBA el correo llega a tu propio buzón: tu respuesta cuenta, salvo el mensaje original.
    nuevos = nuevos.filter(function (m) { return m.getId() !== todos[0].getId(); });
  } else {
    nuevos = nuevos.filter(function (m) { return !direcciones(m.getFrom()).some(function (d) { return propios[d]; }); });
  }
  if (!nuevos.length) return;

  const rebotes = nuevos.filter(function (m) { return /mailer-daemon|postmaster/i.test(m.getFrom()); });
  const respuestas = nuevos.filter(function (m) { return rebotes.indexOf(m) === -1; });

  if (!respuestas.length && rebotes.length) {
    o.estado = 'ERROR';
    guardarBloquePrograma(o);
    eventos.push([etiqueta(o), 'ERROR', 'El correo rebotó (' + o.correo_oficina + '). Revisa la dirección y vuelve a enviar.']);
    resumen.rebotes++;
    return;
  }

  const ultima = respuestas[respuestas.length - 1];
  const quien = direcciones(respuestas[0].getFrom())[0] || respuestas[0].getFrom();
  const archivos = [];
  respuestas.forEach(function (m) {
    m.getAttachments({ includeInlineImages: false, includeAttachments: true }).forEach(function (a) {
      const tipo = a.getContentType();
      if (/pdf/i.test(tipo) || /\.pdf$/i.test(a.getName()) || /^image\/(png|jpe?g)/i.test(tipo)) archivos.push(a);
    });
  });

  o.fecha_respuesta = ultima.getDate();
  o.respondio_por = quien;

  if (!archivos.length) {
    // Respondió pero sin adjunto: sigue ENVIADA. La fecha_respuesta evita contarlo dos veces.
    guardarBloquePrograma(o);
    eventos.push([etiqueta(o), 'AVISO', 'Respondió sin adjunto (' + quien + '). Sigue esperando el sellado.']);
    resumen.sinAdjunto++;
    return;
  }

  const base = limpiarNombre(o.cod_oficina + '-' + o.municipio + '-' + o.periodo) + '-SELLADO';
  const guardados = archivos.map(function (a, i) {
    const ext = /pdf/i.test(a.getContentType()) || /\.pdf$/i.test(a.getName()) ? '.pdf' : (/png/i.test(a.getContentType()) ? '.png' : '.jpg');
    const copia = a.copyBlob().setName(base + (i ? '-' + (i + 1) : '') + ext);
    return carpeta.createFile(copia);
  });
  o.sellado_link = guardados[0].getUrl();
  o.estado = 'RESPONDIDA';
  guardarBloquePrograma(o);
  eventos.push([etiqueta(o), 'RESPONDIO', 'De ' + quien + ' · ' + guardados.length + ' archivo(s) · ' + o.sellado_link]);
  resumen.respondidas++;
  try { avisarRespuesta(o, cfg, guardados.map(function (f) { return f.getBlob(); })); }
  catch (e) { eventos.push([etiqueta(o), 'ERROR', 'No se pudo avisar la respuesta: ' + e.message]); }
}

/** Avisa a quien envió (y al equipo en copia oculta) que llegó el sellado. */
function avisarRespuesta(o, cfg, blobs) {
  if (cupoRestante() < 1) return;
  const para = listaCorreos(o.enviado_por).join(',') || cfg.correo_remitente;
  const equipo = (cfg.esPrueba || String(cfg.avisar_equipo).toUpperCase() === 'NO') ? [] : listaCorreos(cfg.copia_oculta);
  const asunto = (cfg.esPrueba ? '[PRUEBA] ' : '') + 'Llegó el sellado: ' + o.municipio + ' · ' + o.impuesto + ' ' + o.periodo;
  const datos = [['Municipio', o.municipio + ' (oficina ' + o.cod_oficina + ')'], ['Impuesto', o.impuesto + ' · ' + o.periodo],
    ['Consecutivo', o.consecutivo], ['Respondió', o.respondio_por], ['Fecha', textoFecha(o.fecha_respuesta, 'dd/MM/yyyy HH:mm')]];
  const texto = 'Ya respondió la oficina y el soporte sellado quedó guardado en Drive.\n\n' +
    datos.map(function (d) { return d[0] + ': ' + d[1]; }).join('\n') + '\n\nSellado: ' + linkDeDrive(o.sellado_link);
  const html = '<div style="font-family:Segoe UI,Helvetica,sans-serif;font-size:14px"><p><b>Ya respondió la oficina.</b> El soporte sellado quedó guardado en Drive y va adjunto.</p>' +
    '<table style="border-collapse:collapse">' + datos.map(function (d) {
      return '<tr><td style="padding:3px 12px 3px 0;color:#7A756B">' + escapar(d[0]) + '</td><td><b>' + escapar(d[1]) + '</b></td></tr>';
    }).join('') + '</table><p><a href="' + escapar(linkDeDrive(o.sellado_link)) + '">Abrir el sellado en Drive</a></p></div>';
  const opciones = { name: cfg.nombre_remitente, htmlBody: html, attachments: blobs };
  if (equipo.length) opciones.bcc = equipo.join(',');
  GmailApp.sendEmail(para, asunto, texto, opciones);
  sumarCorreos(1);
}

function guardarMarca(clave) {
  PropertiesService.getScriptProperties().setProperty(clave, new Date().toISOString());
}

// ---------- Lo que pinta la pestaña ----------

function listarRespuestas() {
  const cfg = leerConfig();
  const diasEspera = Number(cfg.dias_respuesta) || 3;
  const filas = leerObligaciones()
    .filter(function (o) { return o.fecha_envio instanceof Date && (o.estado === 'ENVIADA' || o.estado === 'RESPONDIDA' || (o.estado === 'ERROR' && o.hilo)); })
    .map(function (o) {
      const estimada = diasHabilesMas(o.fecha_envio, diasEspera);
      const dEst = diasPara(estimada);
      let est;
      if (o.estado === 'RESPONDIDA') est = 'RECIBIDO';
      else if (o.estado === 'ERROR') est = 'REBOTO';
      else if (o.fecha_respuesta instanceof Date) est = 'SIN_SELLADO';
      else est = dEst < 0 ? 'ATRASADA' : 'EN_ESPERA';
      return {
        fila: o.fila, municipio: o.municipio, cod_oficina: o.cod_oficina, impuesto: o.impuesto, periodo: o.periodo,
        consecutivo: o.consecutivo, correo_oficina: o.correo_oficina, enviado_por: o.enviado_por,
        fecha_envio: textoFecha(o.fecha_envio, 'dd/MM/yyyy HH:mm'), ts_envio: o.fecha_envio.getTime(),
        documento: nombreSoporte(o), documentoUrl: linkDeDrive(o.soporte_link),
        estimada: textoFecha(estimada), diasParaEstimada: dEst, despuesDeVencer: !!(o.vence && estimada > o.vence),
        vence: textoFecha(o.vence), diasVence: diasPara(o.vence),
        estadoResp: est,
        fecha_respuesta: o.fecha_respuesta instanceof Date ? textoFecha(o.fecha_respuesta, 'dd/MM/yyyy HH:mm') : '',
        respondio_por: o.respondio_por || '', selladoUrl: linkDeDrive(o.sellado_link)
      };
    });
  const peso = { ATRASADA: 0, REBOTO: 1, SIN_SELLADO: 2, EN_ESPERA: 3, RECIBIDO: 4 };
  filas.sort(function (a, b) { return (peso[a.estadoResp] - peso[b.estadoResp]) || (a.ts_envio - b.ts_envio); });
  return {
    filas: filas, modo: cfg.esPrueba ? 'PRUEBA' : 'PRODUCCION', diasEspera: diasEspera,
    ultimaRevision: PropertiesService.getScriptProperties().getProperty('ultima_revision') || ''
  };
}
