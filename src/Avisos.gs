/**
 * Avisos.gs — avisos diarios por vencimiento, disparadores y datos del tablero ALERTAS.
 */

function instalarDisparadores() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['revisarRespuestas', 'avisar'].indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('revisarRespuestas').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('avisar').timeBased().atHour(7).everyDays(1).inTimezone('America/Bogota').create();
}

/**
 * Trigger diario 7am. Un solo correo por responsable.
 * El trigger le pasa un objeto; solo avisar(true) obliga a repetir el mismo día.
 */
function avisar(forzar) {
  return conLock(function () {
    const cfg = leerConfig();
    const props = PropertiesService.getScriptProperties();
    const hoy = hoyTexto();
    if (forzar !== true && props.getProperty('avisar_dia') === hoy) return { omitido: true };

    const dias = String(cfg.dias_aviso).split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return !isNaN(n); });
    const grupos = {};
    leerObligaciones().forEach(function (o) {
      if (o.estado === 'RESPONDIDA' || !o.vence) return;
      const d = diasPara(o.vence);
      const entra = (d < 0 && d >= -DIAS_VENCIDA_AVISO) || dias.indexOf(d) !== -1;
      if (!entra) return;
      const r = o.responsable || '(sin responsable)';
      (grupos[r] = grupos[r] || []).push({ o: o, d: d });
    });

    const correos = {};
    Object.keys(cfg).forEach(function (k) {
      if (/^correo_/i.test(k) && k.toLowerCase() !== 'correo_remitente' && k.toLowerCase() !== 'correo_oficina') {
        correos[k.slice(7).trim().toLowerCase()] = cfg[k];
      }
    });

    const eventos = [];
    let enviados = 0;
    Object.keys(grupos).forEach(function (resp) {
      if (cupoRestante() < 1) return;
      const items = grupos[resp].sort(function (a, b) { return a.d - b.d; });
      const propio = listaCorreos(correos[resp.toLowerCase()])[0];
      const para = cfg.esPrueba ? cfg.correo_remitente : (propio || cfg.correo_remitente);
      const msg = armarAviso(resp, items, cfg);
      const opciones = { name: cfg.nombre_remitente, htmlBody: msg.html };
      // Copia oculta al dueño de la app para que vea exactamente lo que salió.
      if (String(cfg.copia_a_mi).toUpperCase() !== 'NO' && para.toLowerCase().indexOf(correoDueno().toLowerCase()) === -1) opciones.bcc = correoDueno();
      GmailApp.sendEmail(para, msg.asunto, msg.texto, opciones);
      sumarCorreos(1);
      enviados++;
      eventos.push([resp, 'AVISO', items.length + ' obligaciones → ' + para + (!cfg.esPrueba && !propio ? ' (falta la fila correo_' + resp + ' en CONFIG)' : '')]);
    });
    registrarEventos(eventos);
    props.setProperty('avisar_dia', hoy);
    return { enviados: enviados, responsables: Object.keys(grupos).length };
  });
}

/** El número crítico va al frente del asunto: "3 vencen en 4 días". */
function asuntoAviso(items) {
  const vencidas = items.filter(function (x) { return x.d < 0; }).length;
  const proximas = items.filter(function (x) { return x.d >= 0; });
  const partes = [];
  if (proximas.length) {
    const dMin = proximas[0].d; // ya vienen ordenadas
    const n = proximas.filter(function (x) { return x.d === dMin; }).length;
    const cuando = dMin === 0 ? 'hoy' : 'en ' + dMin + (dMin === 1 ? ' día' : ' días');
    partes.push(n + (n === 1 ? ' vence ' : ' vencen ') + cuando);
  }
  if (vencidas) partes.push(vencidas + (vencidas === 1 ? ' vencida' : ' vencidas'));
  if (proximas.length && vencidas) return partes.join(' · ');
  return partes[0] || 'Sin pendientes';
}

function armarAviso(responsable, items, cfg) {
  const asunto = (cfg.esPrueba ? '[PRUEBA] ' : '') + asuntoAviso(items);
  const etiquetaDia = function (d) { return d < 0 ? 'vencida hace ' + (-d) + ' d' : (d === 0 ? 'vence hoy' : 'vence en ' + d + ' d'); };
  const texto = 'Hola ' + responsable + ',\n\n' + items.map(function (x) {
    return '- ' + x.o.municipio + ' · ' + x.o.impuesto + ' ' + x.o.periodo + ' · ' + textoFecha(x.o.vence) + ' (' + etiquetaDia(x.d) + ') · ' + x.o.estado;
  }).join('\n');
  const filas = items.map(function (x) {
    const color = x.d < 0 ? '#B00510' : (x.d <= 4 ? '#B06C00' : '#1F7A4D');
    return '<tr><td style="padding:6px 10px;border-top:1px solid #eee">' + escapar(x.o.municipio) + '</td>' +
      '<td style="padding:6px 10px;border-top:1px solid #eee">' + escapar(x.o.impuesto + ' ' + x.o.periodo) + '</td>' +
      '<td style="padding:6px 10px;border-top:1px solid #eee">' + textoFecha(x.o.vence) + '</td>' +
      '<td style="padding:6px 10px;border-top:1px solid #eee;color:' + color + ';font-weight:600">' + etiquetaDia(x.d) + '</td>' +
      '<td style="padding:6px 10px;border-top:1px solid #eee;color:#7A756B">' + escapar(x.o.estado) + '</td></tr>';
  }).join('');
  const html = '<div style="font-family:Segoe UI,Helvetica,sans-serif;font-size:14px"><p>Hola ' + escapar(responsable) + ',</p>' +
    '<p>Esto es lo que requiere atención:</p><table style="border-collapse:collapse;font-size:13px">' + filas + '</table></div>';
  return { asunto: asunto, texto: texto, html: html };
}

// ---------- Datos del tablero ALERTAS ----------

function isoFecha(d) { return d instanceof Date ? textoFecha(d, 'yyyy-MM-dd') : ''; }

function datosAlertas() {
  const cfg = leerConfig();
  const filas = leerObligaciones().map(function (o) {
    return {
      f: o.fila, mu: o.municipio, co: o.cod_oficina, im: o.impuesto, pe: o.periodo,
      ve: isoFecha(o.vence), di: diasPara(o.vence), re: o.responsable, es: o.estado,
      va: Number(o.valor) || 0, fe: isoFecha(o.fecha_envio), fr: isoFecha(o.fecha_respuesta)
    };
  });
  return {
    filas: filas, hoy: hoyTexto(), modo: cfg.esPrueba ? 'PRUEBA' : 'PRODUCCION',
    ultimaRevision: PropertiesService.getScriptProperties().getProperty('ultima_revision') || ''
  };
}
