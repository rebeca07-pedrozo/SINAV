/** SINAV · lectura del maestro. Nunca formulas vivas: lo que ve la interfaz es lo guardado. */

/**
 * Los estados que todavia esperan un envio.
 *
 * Es una FUNCION y no un `var` a proposito: un `var` en el nivel superior se
 * evalua cuando Apps Script carga el archivo, y si este archivo carga antes
 * que 00_Constantes, ESTADO todavia no existe y el proyecto entero revienta
 * con "ReferenceError: ESTADO is not defined". Dentro de una funcion, la
 * constante se lee cuando alguien llama, con todo ya cargado.
 */
function estadosPorEnviar() {
  return [ESTADO.PENDIENTE, ESTADO.LISTA, ESTADO.DEVUELTA, ESTADO.REBOTADO];
}

/** Agrega a una fila cruda lo que la interfaz necesita y no esta en la hoja. */
function decorar(o) {
  var dias = diasHasta(o.vencimiento);
  var env = puedeEnviar(o);

  var nivel = 'neutro';
  if (o.estado === ESTADO.APROBADA || o.estado === ESTADO.REVISADA) nivel = 'aldia';
  else if (dias !== null && dias < 0) nivel = 'vencido';
  else if (dias !== null && dias <= 4) nivel = 'porvencer';
  else if (o.estado === ESTADO.ENVIADA || o.estado === ESTADO.RESPONDIDA) nivel = 'aldia';

  if (o.estado === ESTADO.SIN_EVIDENCIA || o.estado === ESTADO.REBOTADO) nivel = 'vencido';

  return {
    id: String(o.id),
    cod_dane: String(o.cod_dane),
    cod_oficina: String(o.cod_oficina),
    municipio: String(o.municipio),
    impuesto: String(o.impuesto),
    regimen: String(o.regimen),
    periodo: String(o.periodo),
    periodicidad: String(o.periodicidad),
    vencimiento: fechaTexto(o.vencimiento),
    dias: dias,
    nit_municipio: String(o.nit_municipio),
    correo_oficina: String(o.correo_oficina),
    responsable: String(o.responsable),
    tipo_presentacion: String(o.tipo_presentacion),
    paga_quien: String(o.paga_quien || ''),
    forma_pago: String(o.forma_pago || ''),
    requiere_envio: String(o.requiere_envio),
    exogena: String(o.exogena || ''),
    incluye_retencion: String(o.incluye_retencion || ''),
    presentacion_fecha: fechaTexto(o.presentacion_fecha),
    revision_fecha: fechaTexto(o.revision_fecha),
    revision_por: String(o.revision_por || ''),
    estado: String(o.estado),
    valor: o.valor === '' || o.valor === null ? null : Number(o.valor),
    nota: String(o.nota || ''),
    reprocesos: Number(o.reprocesos) || 0,
    motivo_devuelta: String(o.motivo_devuelta || ''),
    fecha_envio: fechaHoraTexto(o.fecha_envio),
    fecha_respuesta: fechaHoraTexto(o.fecha_respuesta),
    // la cadena de evidencia: los cuatro hitos que SINAV existe para cerrar
    cadena: {
      soporte: !!String(o.soporte_id || '').trim(),
      envio: !!String(o.hilo_id || '').trim() || o.estado === ESTADO.ENVIADA,
      respuesta: !!o.fecha_respuesta,
      sellado: !!String(o.sellado_id || '').trim()
    },
    mia: esMia(o.responsable),
    enviable: env.ok,
    motivo_no_enviable: env.motivo,
    nivel: nivel
  };
}

/** Todas las obligaciones que el usuario puede ver: todas, decoradas. */
function listarTodas() {
  return registros(HOJA.OBLIGACIONES)
    .filter(function (o) { return String(o.id || '').trim(); })
    .map(decorar);
}

/**
 * La pestana ENVIAR: solo requiere_envio = SI y estados por enviar.
 * El PROFESIONAL ve las suyas; JEFE y ADMIN ven las de todos.
 * Orden: lo que mas aprieta arriba.
 */
function listarParaEnviar() {
  var todas = puede('asignar') ? listarTodas()
            : listarTodas().filter(function (o) { return o.mia; });

  return todas
    .filter(function (o) {
      return o.requiere_envio === 'SI' && estadosPorEnviar().indexOf(o.estado) >= 0;
    })
    .sort(function (a, b) {
      var da = a.dias === null ? 9999 : a.dias;
      var db = b.dias === null ? 9999 : b.dias;
      if (da !== db) return da - db;
      return a.municipio.localeCompare(b.municipio, 'es');
    });
}

/** Los conteos de las tarjetas que filtran. Se calculan de las filas que se muestran. */
function conteos(lista) {
  var c = { todas: lista.length, sin_soporte: 0, por_vencer: 0, vencidas: 0, listas: 0 };
  lista.forEach(function (o) {
    if (!o.cadena.soporte) c.sin_soporte++;
    if (o.dias !== null && o.dias < 0) c.vencidas++;
    else if (o.dias !== null && o.dias <= 4) c.por_vencer++;
    if (o.enviable) c.listas++;
  });
  return c;
}

/** Una sola llamada al abrir la app: quien soy, la configuracion y las filas. */
function apiInicio() {
  // alta automatica: el correo que entra por primera vez queda inscrito con el
  // rol por defecto. El JEFE y el ADMIN se siguen poniendo a mano en USUARIOS.
  asegurarAlta();

  var q = apiYo();
  if (!q.correo) {
    return { error: 'No se pudo identificar tu cuenta. Entra con tu correo corporativo.' };
  }
  if (!q.activo) {
    return { yo: q, error: 'Tu correo está en la hoja USUARIOS con activo = NO. ' +
      'Alguien lo desactivó a propósito; pídele a un ADMIN que lo revise.' };
  }
  if (!q.rol) {
    return { yo: q, error: 'Tu fila en USUARIOS no tiene un rol que SINAV reconozca. ' +
      'Los valores válidos son PROFESIONAL, JEFE y ADMIN.' };
  }

  var lista = listarParaEnviar();
  return {
    yo: q,
    config: {
      modo: config('modo'),
      nombre_remitente: config('nombre_remitente'),
      dias_aviso: config('dias_aviso')
    },
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
    filas: lista,
    conteos: conteos(lista),
    generado: fechaHoraTexto(new Date())
  };
}

/** Refresca solo la lista de ENVIAR. */
function apiListaEnviar() {
  var lista = listarParaEnviar();
  return {
    filas: lista,
    conteos: conteos(lista),
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
    generado: fechaHoraTexto(new Date())
  };
}
