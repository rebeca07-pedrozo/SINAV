# SINAV v3

Reescritura. Siete archivos en vez de treinta y cinco, siete hojas en vez de
diez.

## Los archivos

| Archivo | En el editor | Qué hay dentro |
|---|---|---|
| `ENTORNO.js` | `ENTORNO` | En qué modo está y cómo cambiarlo. **No depende de nada más** |
| `normalizar.js` | `Normalizar` | Dejar los datos escritos de una sola forma |
| `codigo.js` | `Codigo` | El núcleo: hojas, roles, estados, envío, respuestas |
| `cargaMes.js` | `CargaMes` | Traer el mes del calendario, adhesivos, correos, consecutivos |
| `yasneidy.js` | `Yasneidy` | Lo de ella |
| `jesus.js` | `Jesus` | Lo de él |
| `helen.js` | `Helen` | Lo de ella |
| `pagina.html` | `pagina` | Toda la interfaz |
| `correos.html` | `correos` | El correo que recibe la oficina |

## Las hojas

| Hoja | Quién la escribe |
|---|---|
| **CALENDARIO** | A mano, una vez al año |
| **CODIGOSYCORREOS** | A mano, y la aplicación cuando alguien escribe un correo que faltaba |
| **ADHESIVOS** | Se pega cada mes |
| **USUARIOS** | A mano |
| **CONFIG** | A mano |
| **AUSENCIAS** | La aplicación |
| **EVENTOS** | La aplicación. Append-only |
| **YASNEIDY**, **JESUS**, **HELEN** | La aplicación: una por profesional, solo el mes en curso |

## El orden en que se lee

1. `ENTORNO.js` — el interruptor
2. `normalizar.js` — los datos limpios
3. `codigo.js` — todo lo demás

## Lo que cambió respecto a v2

- Una hoja por profesional, con el mes en curso. Antes era una sola con el
  año entero: 6.320 filas que el libro leía completas en cada pantalla.
- El calendario tiene una columna por mes. El encabezado es el periodo; la
  celda, la fecha de vencimiento. Celda vacía = ese municipio no declara ese
  periodo.
- Desaparecen PROGRAMACION, OBLIGACIONES, VIGENCIAS y ROLES.
