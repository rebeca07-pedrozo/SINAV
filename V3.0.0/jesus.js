/**
 * SINAV · jesus.js — lo de Jesús Jaimes.
 * Ver yasneidy.js para por qué cada profesional tiene su archivo.
 */
function perfilJesus() {
  return {
    correo: 'jesus.jaimes@davivienda.com',
    nombre: 'Jesus Jaimes',
    hoja: 'JESUS',
    prefijo: 'JJ26'
  };
}

function cargarJesus(anio, mes) {
  return cargarProfesional(perfilJesus(), anio, mes);
}
