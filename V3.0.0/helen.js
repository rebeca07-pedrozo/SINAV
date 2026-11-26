/**
 * SINAV · helen.js — lo de Helen Cuadros.
 * Ver yasneidy.js para por qué cada profesional tiene su archivo.
 */
function perfilHelen() {
  return {
    correo: 'helen.cuadros@davivienda.com',
    nombre: 'Helen Cuadros',
    hoja: 'HELEN',
    prefijo: 'HC26'
  };
}

function cargarHelen(anio, mes) {
  return cargarProfesional(perfilHelen(), anio, mes);
}
