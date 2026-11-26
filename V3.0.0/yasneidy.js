/**
 * SINAV · yasneidy.js — lo de Yasneidy Ramírez.
 *
 * Un archivo por persona, y no una lista dentro del codigo, para que dar de
 * alta a alguien sea crear un archivo y nada mas. Si alguien se va, se borra
 * su archivo y deja de existir para el programa, sin tocar nada compartido.
 *
 * El PREFIJO es el de sus consecutivos de giro: LR-10-74. No se inventa ni se
 * cambia, porque revisoria busca esos numeros.
 */
function perfilYasneidy() {
  return {
    correo: 'yasneidy.ramirez@davivienda.com',
    nombre: 'Yasneidy Ramirez',
    hoja: 'YASNEIDY',
    prefijo: 'LR'
  };
}

/** Trae al libro solo lo de ella, del mes en curso. */
function cargarYasneidy(anio, mes) {
  return cargarProfesional(perfilYasneidy(), anio, mes);
}
