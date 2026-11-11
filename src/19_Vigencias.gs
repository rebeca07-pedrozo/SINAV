/**
 * SINAV · vigencias fiscales y carpetas de Drive (REQ-009, REQ-011).
 *
 * El equipo trabaja por ano vencido: en 2027 se presentan las obligaciones de
 * la vigencia 2026. Por eso son tres cosas distintas y no una:
 *
 *   vigencia fiscal      a que ano PERTENECE la obligacion  -> decide la carpeta
 *   ano de presentacion  cuando se presenta
 *   fecha de envio       cuando SINAV mando el correo
 *
 * La carpeta de destino sale SIEMPRE de la vigencia, nunca de la fecha de hoy.
 *
 * Estructura, que el equipo ya creo a mano en Drive:
 *
 *   Territoriales / <vigencia> / Exógenas
 *                              / Declaraciones / Soportes / <municipio> / <impuesto>
 *                                              / Sellados / Soportes
 *
 * Los ids de 2026 estan en VIGENCIAS_CONOCIDAS y se escriben una sola vez.
 * SINAV nunca reemplaza un id que ya este: si una carpeta no responde, avisa
 * en vez de crear otra, porque crear una carpeta nueva seria partir en dos el
 * archivo del equipo sin que nadie se entere.
 */

/** Todas las vigencias de la hoja, como objetos. */
function vigencias() {
  return registros(HOJA.VIGENCIAS)
    .filter(function (v) { return String(v.vigencia || '').trim(); })
    .map(function (v) {
      v.vigencia = String(v.vigencia).trim();
      v.activa = esActivo(v.activa);
      return v;
    });
}

/** La vigencia por defecto: CONFIG.vigencia_actual, o la mayor activa. */
function vigenciaActual() {
  var pedida = String(config('vigencia_actual') || '').trim();
  var todas = vigencias();
  if (pedida && todas.some(function (v) { return v.vigencia === pedida; })) return pedida;
  var activas = todas.filter(function (v) { return v.activa; })
    .map(function (v) { return v.vigencia; }).sort();
  if (activas.length) return activas[activas.length - 1];
  return String(new Date().getFullYear());
}

/** La fila de una vigencia. Lanza si no esta habilitada. */
function vigenciaDe(anio) {
  var a = String(anio || '').trim() || vigenciaActual();
  var v = vigencias().filter(function (x) { return x.vigencia === a; })[0];
  if (!v) {
    throw new Error('La vigencia ' + a + ' no está habilitada. ' +
      'Un PROFESIONAL-III la habilita desde Configuración, o con habilitarVigencia("' + a + '").');
  }
  return v;
}

/** Abre una carpeta por id, con un mensaje util si no responde. */
function carpetaPorId(id, queEs) {
  var limpio = String(id || '').trim();
  if (!limpio) {
    throw new Error('No hay id de Drive para ' + queEs + '. ' +
      'Revisa la hoja VIGENCIAS: SINAV no crea esa carpeta sola, a propósito.');
  }
  try {
    return DriveApp.getFolderById(limpio);
  } catch (e) {
    throw new Error('No se pudo abrir la carpeta de ' + queEs + ' (id ' + limpio + '). ' +
      'O se borró, o la cuenta que desplegó la aplicación no tiene acceso. ' +
      'SINAV no crea otra en su lugar.');
  }
}

/**
 * La carpeta donde va un documento.
 *   clase: 'soportes' | 'sellados' | 'exogenas' | 'sellados_soportes'
 *
 * Para soportes y sellados se baja a <municipio>/<impuesto>, que es como lo
 * pidio el equipo. Las exogenas se quedan en su carpeta por municipio.
 */
function carpetaDocumento(clase, vigencia, municipio, impuesto) {
  var v = vigenciaDe(vigencia);
  var raiz = {
    soportes:          ['carpeta_soportes', 'Soportes'],
    sellados:          ['carpeta_sellados', 'Sellados'],
    exogenas:          ['carpeta_exogenas', 'Exógenas'],
    sellados_soportes: ['carpeta_sellados_soportes', 'Sellados/Soportes']
  }[clase];
  if (!raiz) throw new Error('Clase de carpeta desconocida: ' + clase);

  var base = carpetaPorId(v[raiz[0]], raiz[1] + ' de ' + v.vigencia);
  if (clase === 'exogenas') {
    return carpetaCache(base, [nombreCarpeta(municipio)], clase, v.vigencia);
  }
  return carpetaCache(base, [nombreCarpeta(municipio), nombreCarpeta(impuesto)],
                      clase, v.vigencia);
}

/**
 * Baja por una ruta de subcarpetas creandolas si hacen falta, y se acuerda del
 * id. Buscar carpetas es lo lento de una carga de cuarenta PDF y en un lote
 * del mismo municipio se repetiria cuarenta veces.
 *
 * Solo se crean las subcarpetas de municipio e impuesto. Las carpetas del ano
 * nunca se crean aqui: esas son las que el equipo ya tiene.
 */
function carpetaCache(base, ruta, clase, vigencia) {
  var clave = 'carp:' + vigencia + ':' + clase + ':' + ruta.join('|');
  var props = PropertiesService.getScriptProperties();
  var guardado = props.getProperty(clave);
  if (guardado) {
    try {
      var c = DriveApp.getFolderById(guardado);
      if (!c.isTrashed()) return c;
    } catch (e) { /* la borraron: se vuelve a crear abajo */ }
  }
  var actual = base;
  for (var i = 0; i < ruta.length; i++) actual = carpetaPorNombre(actual, ruta[i]);
  props.setProperty(clave, actual.getId());
  return actual;
}

/**
 * REQ-011. Habilita una vigencia nueva: crea su estructura bajo Territoriales
 * y guarda los ids. No toca las vigencias que ya existen ni mueve nada.
 */
function habilitarVigencia(anio) {
  exige('habilitarVigencia');

  var a = String(anio || '').trim();
  if (!/^20\d{2}$/.test(a)) throw new Error('La vigencia es un año de cuatro dígitos: ' + anio);

  return conCerrojo(function () {
    if (vigencias().some(function (v) { return v.vigencia === a; })) {
      return 'La vigencia ' + a + ' ya estaba habilitada. No se tocó nada.';
    }

    var raiz = carpetaPorId(config('carpeta_territoriales') || CARPETA_TERRITORIALES,
                            'Territoriales');
    var anioDir = carpetaPorNombre(raiz, a);
    var exo = carpetaPorNombre(anioDir, SUBCARPETAS_VIGENCIA.exogenas);
    var dec = carpetaPorNombre(anioDir, SUBCARPETAS_VIGENCIA.declaraciones);
    var sop = carpetaPorNombre(dec, SUBCARPETAS_VIGENCIA.soportes);
    var sel = carpetaPorNombre(dec, SUBCARPETAS_VIGENCIA.sellados);
    var selSop = carpetaPorNombre(sel, SUBCARPETAS_VIGENCIA.sellados_soportes);

    var fila = {
      vigencia: a,
      carpeta_exogenas: exo.getId(),
      carpeta_declaraciones: dec.getId(),
      carpeta_soportes: sop.getId(),
      carpeta_sellados: sel.getId(),
      carpeta_sellados_soportes: selSop.getId(),
      activa: 'SI'
    };
    agregarFilas(HOJA.VIGENCIAS, [COLS.VIGENCIAS.map(function (c) {
      return fila[c] === undefined ? '' : fila[c];
    })]);
    registrar('', EVENTO.AVISO, 'vigencia ' + a + ' habilitada por ' + yo().correo);

    return 'Vigencia ' + a + ' habilitada en Territoriales/' + a + '.\n' +
           'Las vigencias anteriores no se tocaron.';
  });
}

/** Lo que la interfaz necesita saber de las vigencias. */
function apiVigencias() {
  return {
    actual: vigenciaActual(),
    vigencias: vigencias().map(function (v) {
      return { vigencia: v.vigencia, activa: v.activa };
    }),
    puedeHabilitar: puede('habilitarVigencia')
  };
}
