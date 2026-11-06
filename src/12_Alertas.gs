/**
 * SINAV · alertas.
 *
 * La pregunta de esta pantalla: que se me vence y cuando.
 *
 * Los cortes salen de CONFIG.dias_aviso (por defecto 10,4,2,0), que hasta
 * ahora era un parametro que nadie leia. Son dias ANTES del vencimiento: a los
 * 10, a los 4, a los 2 y el mismo dia.
 *
 * Una obligacion ya APROBADA no alerta: su cadena de evidencia esta cerrada.
 * Una vencida alerta siempre, este donde este, porque el vencimiento no se
 * reinicia nunca.
 */

/** Los cortes de CONFIG, de mayor a menor y sin basura. */
function diasDeAviso() {
  var crudo = config('dias_aviso') || '10,4,2,0';
  var ds = String(crudo).split(/[,;\s]+/)
    .map(function (x) { return parseInt(x, 10); })
    .filter(function (n) { return !isNaN(n) && n >= 0; });
  if (!ds.length) ds = [10, 4, 2, 0];
  return ds.sort(function (a, b) { return b - a; });
}

/**
 * Reparte las obligaciones en tramos de urgencia. Puro: recibe las filas ya
 * decoradas y los cortes, no los busca.
 *
 * Los tramos salen en el orden en que hay que mirarlos: lo que ya se vencio
 * primero, lo que falta mas tiempo al final.
 */
function agruparAlertas(filas, cortes) {
  var ds = (cortes && cortes.length ? cortes : [10, 4, 2, 0])
    .slice()
    .filter(function (d) { return d > 0; })     // el 0 es "hoy", que va aparte
    .sort(function (a, b) { return a - b; });   // ascendente: el mas urgente primero

  var vivas = (filas || []).filter(function (o) {
    return o.estado !== ESTADO.APROBADA;
  });

  var tramos = [];
  var puestas = {};

  var meter = function (id, et, detalle, nivel, prueba) {
    var lista = vivas.filter(function (o) {
      return !puestas[o.id] && prueba(o);
    });
    lista.forEach(function (o) { puestas[o.id] = true; });
    tramos.push({ id: id, et: et, detalle: detalle, nivel: nivel,
                  cuantas: lista.length, filas: lista });
  };

  // 1. vencidas: alertan siempre, esten donde esten
  meter('vencidas', 'Ya vencidas',
        'El vencimiento no se reinicia nunca, ni al devolver.', 'vencido',
        function (o) { return o.dias !== null && o.dias < 0; });

  // 2. hoy es su propio tramo, haya o no un 0 en dias_aviso
  meter('hoy', 'Vencen hoy', 'Último día para presentar.', 'vencido',
        function (o) { return o.dias === 0; });

  // 3. un tramo por cada corte, del mas urgente al menos.
  // Como se va marcando lo ya puesto, cada obligacion cae en el tramo mas
  // urgente que le corresponde y no se repite mas abajo.
  ds.forEach(function (d) {
    meter('en' + d, 'Vencen en ' + d + (d === 1 ? ' día' : ' días') + ' o menos',
          'Aviso de los ' + d + ' días.',
          d <= 4 ? 'porvencer' : 'neutro',
          function (o) { return o.dias !== null && o.dias > 0 && o.dias <= d; });
  });

  // 4. lo que todavia no entra en ningun aviso
  meter('despues', 'Más adelante',
        ds.length ? 'Fuera de los avisos configurados (' + ds.join(', ') + ' días).'
                  : 'No hay avisos configurados en CONFIG.dias_aviso.',
        '',
        function (o) { return o.dias !== null && o.dias > 0; });

  // 5. sin fecha: no se puede avisar de algo que no vence nunca
  meter('sinfecha', 'Sin fecha de vencimiento',
        'No se les puede calcular aviso. Hay que revisar el dato.', 'porvencer',
        function (o) { return o.dias === null; });

  var cuantas = function (id) {
    var t = tramos.filter(function (x) { return x.id === id; })[0];
    return t ? t.cuantas : 0;
  };

  return {
    cortes: ds,
    tramos: tramos.filter(function (t) { return t.cuantas > 0; }),
    total: vivas.length,
    vencidas: cuantas('vencidas'),
    hoy: cuantas('hoy'),
    criticas: cuantas('vencidas') + cuantas('hoy'),
    sin_soporte: vivas.filter(function (o) {
      return !(o.cadena && o.cadena.soporte);
    }).length
  };
}

/**
 * La pantalla de alertas.
 * El PROFESIONAL ve lo suyo; JEFE y ADMIN ven lo de todos, que es lo que les
 * permite repartir el trabajo antes de que se venza.
 */
function apiAlertas() {
  var q = yo();
  if (!q.activo) throw new Error('Tu usuario está inactivo en SINAV.');

  var mias = puede('asignar') ? listarTodas()
           : listarTodas().filter(function (o) { return o.mia; });

  var r = agruparAlertas(mias, diasDeAviso());
  r.yo = { correo: q.correo, ve_todo: puede('asignar') };
  r.sin_responsable = mias.filter(function (o) {
    return !String(o.responsable || '').trim();
  }).length;
  r.generado = fechaHoraTexto(new Date());
  return r;
}
