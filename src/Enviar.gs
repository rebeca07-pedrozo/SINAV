/**
 * Enviar.gs — pestaña ENVIAR: listar pendientes, subir el PDF, mandar el correo.
 */

// ---------- Listar ----------

/** Lo que pinta la pestaña ENVIAR: pendientes y con error, ordenadas por vencimiento. */
function listarEnviar() {
  const cfg = leerConfig();
  const filas = leerObligaciones()
    .filter(function (o) { return o.estado === 'PENDIENTE' || o.estado === 'ERROR'; })
    .map(function (o) {
      return {
        fila: o.fila, municipio: o.municipio, cod_oficina: o.cod_oficina, impuesto: o.impuesto,
        periodo: o.periodo, vence: textoFecha(o.vence), dias: diasPara(o.vence),
        responsable: o.responsable, consecutivo: o.consecutivo, valor: o.valor,
        correo_oficina: o.correo_oficina, estado: o.estado, tieneSoporte: !!o.soporte_link,
        soporteUrl: linkDeDrive(o.soporte_link)
      };
    })
    .sort(function (a, b) { return (a.dias === null ? 9999 : a.dias) - (b.dias === null ? 9999 : b.dias); });
  return {
    filas: filas,
    modo: cfg.esPrueba ? 'PRUEBA' : 'PRODUCCION',
    destinoPrueba: cfg.correo_remitente,
    correosHoy: correosHoy(),
    limite: LIMITE_CORREOS
  };
}

// ---------- Subir soporte ----------

/**
 * archivo = { nombre, base64 } llega desde la interfaz.
 * Guarda el PDF en carpeta_soportes como {cod_oficina}-{municipio}-{periodo}.pdf.
 */
function subirSoporte(idFila, archivo) {
  const cfg = leerConfig();
  if (!cfg.carpeta_soportes) throw new Error('Falta la propiedad del script carpeta_soportes (Configuración del proyecto).');
  if (!archivo || !archivo.base64) throw new Error('No llegó el archivo.');
  const bytes = Utilities.base64Decode(archivo.base64);
  if (bytes.length < 5 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF') {
    throw new Error('El archivo no es un PDF.');
  }
  const o = leerObligaciones().filter(function (x) { return x.fila === Number(idFila); })[0];
  if (!o) throw new Error('No encontré la fila ' + idFila + '.');
  if (o.estado === 'ENVIADA' || o.estado === 'RESPONDIDA') throw new Error('Esa declaración ya fue enviada.');

  const nombre = nombreSoporte(o);
  // Drive es lento: se hace fuera del lock. Solo la escritura en la hoja va con lock.
  const archivoDrive = DriveApp.getFolderById(cfg.carpeta_soportes)
    .createFile(Utilities.newBlob(bytes, 'application/pdf', nombre));

  return conLock(function () {
    const actual = leerObligaciones().filter(function (x) { return x.fila === Number(idFila); })[0];
    if (!actual || actual.consecutivo !== o.consecutivo) throw new Error('La hoja cambió mientras subías el archivo. Recarga la lista.');
    actual.soporte_link = archivoDrive.getUrl(); // enlace completo, no solo el id
    if (actual.estado === 'ERROR') actual.estado = 'PENDIENTE';
    guardarBloquePrograma(actual);
    registrarEventos([[etiqueta(actual), 'SOPORTE', 'Cargado ' + nombre]]);
    return { soporte_link: actual.soporte_link, nombre: nombre };
  });
}


// ---------- Enviar ----------

/**
 * listaDeFilas = números de fila de la hoja OBLIGACIONES.
 * Sin soporte_link no se manda. Guarda el threadId en la columna hilo.
 * Si se acerca a los 6 minutos, se detiene y devuelve las que quedaron sin procesar.
 */
function enviar(listaDeFilas) {
  const inicio = Date.now();
  return conLock(function () {
    const cfg = leerConfig();
    const pedidas = {};
    (listaDeFilas || []).forEach(function (f) { pedidas[Number(f)] = true; });
    const todas = leerObligaciones();
    const objetivo = todas.filter(function (o) { return pedidas[o.fila]; });

    const eventos = [];
    const resultado = { enviadas: 0, errores: 0, sinProcesar: [], detalle: [] };
    let cupo = cupoRestante();
    const destinoPrueba = cfg.correo_remitente;
    const quien = quienSoy();
    const copia = cfg.esPrueba ? [] : listaCorreos(cfg.copia_oculta);
    const copiaVisible = cfg.esPrueba ? [] : listaCorreos(cfg.copia_visible);
    const directorio = leerDirectorio();
    const responsables = leerResponsables();

    // Si piden alias y no está autorizado en Gmail, no se manda nada con otra identidad.
    let errorGeneral = '';
    if (cfg.usar_alias.toUpperCase() === 'SI' && GmailApp.getAliases().indexOf(cfg.correo_remitente) === -1) {
      errorGeneral = 'usar_alias = SI pero ' + cfg.correo_remitente + ' no está como "Enviar como" en Gmail.';
    }

    try {
      objetivo.forEach(function (o) {
        if (Date.now() - inicio > TIEMPO_MAX_MS) { resultado.sinProcesar.push(o.fila); return; }

        const falla = function (motivo) {
          o.estado = 'ERROR';
          guardarBloquePrograma(o);
          eventos.push([etiqueta(o), 'ERROR', motivo]);
          resultado.errores++;
          resultado.detalle.push({ fila: o.fila, ok: false, motivo: motivo });
        };

        if (o.estado === 'ENVIADA' || o.estado === 'RESPONDIDA') {
          resultado.detalle.push({ fila: o.fila, ok: false, motivo: 'Ya estaba ' + o.estado.toLowerCase() + '.' });
          return;
        }
        if (errorGeneral) return falla(errorGeneral);
        if (!o.soporte_link) return falla('Sin soporte: no se envía.');

        const faltan = camposFaltantes(o);
        if (faltan.length) return falla('Faltan datos para armar el correo: ' + faltan.join(', ') + '.');
        const oficina = destinatariosOficina(o, directorio);
        if (!oficina.length) return falla('No hay correo para la oficina ' + o.cod_oficina + ': llénalo en la fila o en la pestaña DIRECTORIO.');
        const para = cfg.esPrueba ? destinoPrueba : oficina.join(',');
        if (cupo < 1) { resultado.sinProcesar.push(o.fila); return; }

        try {
          const pdf = DriveApp.getFileById(idDeLink(o.soporte_link)).getBlob();
          const msg = armarCorreo(o, cfg, oficina, responsables[String(o.responsable).toLowerCase()]);
          const opciones = { name: cfg.nombre_remitente, htmlBody: msg.html, attachments: [pdf] };
          if (cfg.responder_a) opciones.replyTo = cfg.responder_a; // vacío: responden a la cuenta que envía
          if (copiaVisible.length) opciones.cc = copiaVisible.join(',');
          if (copia.length) opciones.bcc = copia.join(',');
          if (cfg.usar_alias.toUpperCase() === 'SI') opciones.from = cfg.correo_remitente;

          // createDraft + send() devuelve el mensaje, y de ahí sale el threadId.
          const enviado = GmailApp.createDraft(para, msg.asunto, msg.texto, opciones).send();
          o.hilo = enviado.getThread().getId();
          o.estado = 'ENVIADA';
          o.fecha_envio = new Date();
          o.enviado_por = quien;
          o.enviado_a = oficina.join(', ');
          guardarBloquePrograma(o);
          cupo--;
          sumarCorreos(1);
          eventos.push([etiqueta(o), 'ENVIADO',
            (cfg.esPrueba ? 'PRUEBA → ' + para : 'A ' + para + (copiaVisible.length ? ' · CC ' + copiaVisible.join(', ') : '') + (copia.length ? ' (+' + copia.length + ' en copia oculta)' : '')) + ' · lo envió ' + quien + ' · hilo ' + o.hilo]);
          resultado.enviadas++;
          resultado.detalle.push({ fila: o.fila, ok: true });
        } catch (e) {
          falla('No se pudo enviar: ' + e.message);
        }
      });
    } finally {
      registrarEventos(eventos);
    }
    resultado.correosHoy = correosHoy();
    return resultado;
  });
}

function listaCorreos(texto) {
  return String(texto || '').split(/[,;\s]+/).map(function (s) { return s.trim(); })
    .filter(function (s) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s); });
}

function escapar(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
