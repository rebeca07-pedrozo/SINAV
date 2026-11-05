# SINAV

Control de obligaciones tributarias territoriales · Departamento de Impuestos,
Banco Davivienda. Google Sheets + Apps Script + una aplicación web.

Contexto de producto en [PRODUCT.md](PRODUCT.md). Decisiones visuales en
[DESIGN.md](DESIGN.md).

---

## Lo primero: qué funciones se ejecutan

Son **tres**, y las tres viven en el menú **SINAV** que aparece dentro del
Sheets. No hace falta abrir el editor de Apps Script para el día a día.

| Función | En qué archivo vive | Cómo se corre | Cuándo |
|---|---|---|---|
| `instalar()` | `01_Instalar` | Menú **SINAV → Instalar / verificar** | La primera vez, y **cada vez que actualices el código** |
| `migrar()` | `01_Instalar` | Menú **SINAV → Migrar columnas** | Una sola vez, **después** de `instalar()`, si el libro ya tenía filas |
| `pruebas()` | `99_Pruebas` | Menú **SINAV → Correr pruebas** | Cuando cambies código o algo huela raro |

Las tres son **idempotentes**: correrlas dos veces no duplica ni rompe nada.

### El archivo abierto en el editor da igual

Esto confunde a todo el mundo la primera vez. En Apps Script **no se corre "la
función del archivo que tienes abierto"**. Todos los archivos comparten un solo
ámbito global, así que cualquier función es visible desde cualquier parte.

Lo que manda es **el desplegable de funciones** en la barra de arriba del
editor, al lado del botón **Ejecutar**. Ese desplegable lista las funciones de
*todo* el proyecto. Eliges `instalar` ahí y le das a Ejecutar, sin importar qué
archivo estés viendo.

Por eso la columna "en qué archivo vive" es solo para que sepas dónde leer el
código, no para correrlo.

Y más fácil todavía: **usa el menú SINAV dentro del Sheets** y olvídate del
editor. Si el menú no aparece, cierra y vuelve a abrir el libro.

Hay una cuarta, `onOpen()`, que **nunca se corre a mano**: Google la llama sola
al abrir el libro y es la que pinta el menú.

Todas las demás funciones del proyecto empiezan por `api…` (`apiInicio`,
`apiEnviar`, `apiSubirSoporte`, `apiMetricas`…). Esas **las llama la aplicación
web**, no tú. Correrlas a mano desde el editor no sirve de nada: esperan
argumentos que manda el navegador y devuelven datos para pintar una pantalla.

---

## Puesta en marcha, paso a paso

### 1 · Enlazar el script al libro

Abre el Sheets **SINAV** → **Extensiones** → **Apps Script**.

El script tiene que quedar **enlazado a ese archivo**, no suelto, para que
`SpreadsheetApp.getActive()` funcione sin ids. Si creas el proyecto desde
script.google.com en vez de desde el menú Extensiones, nada de esto va a
funcionar.

### 2 · Copiar los archivos

En el editor, crea los archivos con estos nombres **exactos** y pega el
contenido de `src/`. Los `.gs` van sin extensión; los de `ui/` van como HTML y
el nombre lleva la barra.

| En el editor de Apps Script | En este repo |
|---|---|
| `00_Constantes`, `01_Instalar`, `02_Hojas`, `03_Roles`, `04_Normalizar`, `05_Eventos`, `06_Estados`, `07_Obligaciones`, `08_Soportes`, `09_Enviar`, `10_WebApp`, `14_Campos`, `15_Carga`, `16_Metricas`, `99_Pruebas` | `src/*.gs` |
| `ui/Index`, `ui/Estilos`, `ui/Comun`, `ui/Enviar`, `ui/Carga`, `ui/Campos`, `ui/Metricas`, `ui/App` | `src/ui/*.html` |
| `appsscript.json` | `appsscript.json` |

Para ver `appsscript.json` en el editor hay que activar **Configuración del
proyecto → Mostrar el archivo de manifiesto "appsscript.json"**.

El orden de los archivos en el editor **no importa**, y eso está garantizado por
una comprobación: `node tools/pruebas.mjs` carga los quince `.gs` al revés y
falla si alguno depende del orden.

Esto no es un detalle menor. Si un archivo declarara en su nivel superior algo
como `var X = [ESTADO.PENDIENTE]`, leyendo una constante de `00_Constantes`, el
proyecto entero reventaría con `ReferenceError: ESTADO is not defined` en cuanto
ese archivo quedara antes que `00_Constantes` en la lista. Por eso todo lo que
lee constantes de otro archivo está dentro de una función, no suelto.

### 3 · Correr `instalar()`

Menú **SINAV → Instalar / verificar**. La primera vez Google va a pedirte
autorizar permisos (Sheets, Drive, Gmail): acepta.

Si todavía no ves el menú SINAV, cierra y vuelve a abrir el Sheets, o corre
`instalar` desde el editor eligiéndola en el desplegable de funciones.

Esto deja hecho, en este orden:

1. **Las cinco hojas** con sus encabezados, formatos y fila congelada:
   CONFIG, USUARIOS, ROLES, OBLIGACIONES y EVENTOS.
2. **Las carpetas de Drive**: `SINAV/Soportes` y `SINAV/Sellados`, y guarda sus
   ids en CONFIG.
3. **Los parámetros base de CONFIG**, con `modo = PRUEBA`.
4. **La hoja ROLES**, que describe qué puede cada rol.
5. **Tu correo inscrito como ADMIN** en USUARIOS.
6. **Las listas desplegables** en las columnas que se llenan a mano.
7. **La etiqueta `SINAV` de Gmail.**
8. **Tres filas de prueba** en OBLIGACIONES, con su soporte en Drive.

### 4 · Si el libro ya tenía datos, correr `migrar()`

Menú **SINAV → Migrar columnas**. Ver [Migrar un libro que ya
existe](#migrar-un-libro-que-ya-existe). Si acabas de crear el libro de cero,
sáltate este paso.

### 5 · Desplegar la aplicación web

**Implementar → Nueva implementación → Aplicación web**:

- **Ejecutar como:** `Usuario que accede a la aplicación web` ← **esto no es opcional**
- **Quién tiene acceso:** `Cualquier usuario de Banco Davivienda`

Es lo que hace que el correo salga de la cuenta de quien envía y que la
respuesta vuelva a SU bandeja. Si lo pones en "Ejecutar como: yo", todos los
correos saldrían de tu cuenta y las respuestas llegarían a tu bandeja.

### 6 · Dar acceso al libro

Como la app corre como el usuario que accede, **todas las personas necesitan
permiso de edición sobre el libro de Sheets**. Eso se da a mano, compartiendo el
archivo en Drive.

El control de roles **no** son los permisos del archivo: lo hace el servidor
contra la hoja USUARIOS. El permiso de Drive solo abre la puerta; el rol decide
qué ve adentro.

### 7 · Que cada persona entre una vez

Cada quien abre el enlace de la aplicación y autoriza. En esa primera entrada
queda inscrita sola en USUARIOS como `PROFESIONAL` de `MUNICIPALES`, nivel `I`.

### 8 · Ajustar los roles a mano

El de Elizabeth y los de administración. Ver [Los roles](#los-roles).

### 9 · Cuando vayas a producción

Edita `modo` en CONFIG y ponlo en cualquier cosa distinta de `PRUEBA`. Mientras
diga `PRUEBA`, **todos los correos llegan a la bandeja de quien envía**, no a
las oficinas. El código nunca cambia ese valor solo.

---

## Los roles

El rol se resuelve **en el servidor**, con `Session.getActiveUser().getEmail()`
contra la hoja USUARIOS. Nunca se confía en lo que mande el navegador.

| Rol | Quién lo tiene | Qué puede hacer |
|---|---|---|
| `PROFESIONAL` | Por defecto, cualquier correo nuevo | Sus propias obligaciones: subir soportes (uno o en lote), digitalizar los campos manuales y enviar a las oficinas. Las ajenas las ve, no las toca |
| `JEFE` | Elizabeth. A mano | Todo lo del profesional sobre **cualquier** obligación, más asignar responsables, dar el visto bueno (REVISADA / APROBADA), devolver con motivo y ver las métricas |
| `ADMIN` | Quien administra la herramienta. A mano | Todo lo del jefe, más editar CONFIG y USUARIOS |

### La hoja USUARIOS

| Columna | Qué va | Obligatoria |
|---|---|---|
| `correo` | El corporativo, en minúsculas | Sí |
| `nombre` | Como se muestra en la interfaz | No (se deduce del correo) |
| `rol` | `PROFESIONAL`, `JEFE` o `ADMIN` | Sí |
| `activo` | `SI` o `NO` | Sí |
| `area` | `MUNICIPALES` | No |
| `nivel` | `I`, `II` o `III` | No |

**Solo `rol` decide permisos.** `area` y `nivel` se guardan y se muestran — el
pie de la barra lateral dice "Profesional-I de municipales" — pero hoy no
cambian lo que alguien puede hacer: un `PROFESIONAL-I` y un `PROFESIONAL-II`
pueden exactamente lo mismo. Si algún día hay que diferenciarlos, la condición
se agrega en `PERMISO` (en `00_Constantes.gs`) y en ningún otro sitio.

`area` y `nivel` están **al final** de la hoja a propósito. Ver [Migrar un libro
que ya existe](#migrar-un-libro-que-ya-existe).

### Cómo poner a alguien de JEFE

1. Abre la hoja **USUARIOS**.
2. Busca la fila de su correo. Si no está, que entre una vez a la aplicación y
   aparece sola.
3. Cambia la columna `rol` a `JEFE`. La celda es un desplegable.
4. Deja `nivel` vacío: el nivel es de los profesionales.
5. Listo. **No hay que correr nada**: el rol se lee en cada entrada. Si la
   persona tiene la aplicación abierta, que recargue la página.

Lo mismo para `ADMIN`.

### El alta automática

Un correo que entra y no está en USUARIOS queda inscrito solo, con los valores
por defecto de CONFIG:

| Parámetro de CONFIG | Valor por defecto |
|---|---|
| `rol_defecto` | `PROFESIONAL` |
| `area_defecto` | `MUNICIPALES` |
| `nivel_defecto` | `I` |

Esto automatiza el **rol**, no la entrada: la persona sigue necesitando que le
compartas el libro (paso 6). Lo que se ahorra es tener que escribir su fila.

Dos cosas que el alta automática **no** hace:

- No toca a un correo que ya esté en la hoja, ni para corregirle el rol.
- **No reactiva** a nadie que tenga `activo = NO`. Si se lo quitaron, fue a
  propósito.

### Cómo quitarle el acceso a alguien

Pon `activo` en `NO` en su fila de USUARIOS. No borres la fila: si la borras, la
próxima vez que entre el alta automática la vuelve a crear como profesional
activo.

### Cómo cerrar la lista del todo

Deja `rol_defecto` vacío en CONFIG. A partir de ahí, quien no esté en USUARIOS
no entra, y hay que inscribirlo a mano.

---

## Las hojas

| Hoja | Qué es | Quién escribe |
|---|---|---|
| **CONFIG** | Parámetros: `modo`, `nombre_remitente`, carpetas, `dias_aviso`, los `*_defecto` | Tú, a mano, o un ADMIN |
| **USUARIOS** | Correo, nombre, rol, activo, área, nivel | Tú y el alta automática |
| **ROLES** | Solo referencia: qué puede cada rol. `instalar()` la reescribe | El programa |
| **OBLIGACIONES** | El maestro. Una fila por obligación y periodo | El programa y la pantalla de digitalización |
| **EVENTOS** | El log, solo se agrega al final | **Solo** el programa |

**EVENTOS no se edita a mano nunca.** Es la evidencia de qué pasó y cuándo.

---

## Migrar un libro que ya existe

Menú **SINAV → Migrar columnas**, o la función `migrar()`.

**El orden importa:** primero **Instalar / verificar**, que agrega las columnas
nuevas, y después **Migrar columnas**, que reparte los datos. Al revés no
funciona, y `migrar()` te lo dice en vez de hacer un desastre.

Qué cambió y por qué es seguro:

- **USUARIOS gana `area` y `nivel`, al final.** `asegurarHojas()` reescribe la
  fila de encabezados sin mover los datos de abajo, así que una columna nueva
  insertada en la mitad desalinearía todo el libro. Por eso van al final, aunque
  en la documentación se lean en otro orden.
- **`medio_pago` ahora se llama `paga_quien`, en el mismo sitio, y se agregó
  `forma_pago` al final.** Eran dos preguntas distintas en una sola columna:
  *Oficina / Pagaduría* es **quién** paga, y *PSE / transferencia* es **cómo** se
  paga. `migrar()` deja el pagador en `paga_quien` y mueve a `forma_pago` lo que
  era una forma de pago. Un `forma_pago` que ya tenga valor **no se toca**, que
  es lo que hace que correrlo dos veces no borre nada.
- **Drive pasa a `SINAV/Soportes/<municipio>/<impuesto>/`.** Las carpetas se
  crean cuando hacen falta y su id se guarda en las propiedades del script,
  porque buscar carpetas es lo lento de una carga de cuarenta PDF.
  `migrar()` **no mueve** los archivos que ya estaban: se quedan donde están y
  sus enlaces siguen funcionando. Solo los nuevos van a la carpeta del municipio.

---

## Si algo sale mal

| Lo que ves | Qué pasa |
|---|---|
| No aparece el menú **SINAV** | Cierra y abre el Sheets. `onOpen()` solo corre al abrir el libro |
| *"Falta la hoja X. Corre instalar()"* | Eso: menú SINAV → Instalar / verificar |
| `ReferenceError: ESTADO is not defined` (o `HOJA`, `COLS`, `ROL`…) | Falta `00_Constantes` en el proyecto, está vacío, o tiene un error de sintaxis que impide que cargue. Ábrelo y comprueba que tenga las ~150 líneas |
| No encuentro la función `instalar` en el desplegable | Falta `01_Instalar` en el proyecto, o tiene un error de sintaxis. El desplegable solo lista funciones de archivos que cargaron bien |
| *"Tu correo está en la hoja USUARIOS con activo = NO"* | Alguien lo desactivó. Cámbialo a `SI` en USUARIOS |
| *"Tu fila en USUARIOS no tiene un rol que SINAV reconozca"* | El valor de `rol` está mal escrito. Usa el desplegable: `PROFESIONAL`, `JEFE` o `ADMIN` |
| *"No se pudo identificar tu cuenta"* | La persona entró con una cuenta que no es la corporativa |
| *"Tu rol (…) no puede: …"* | Es lo correcto: el rol no alcanza para esa acción |
| *"El libro está ocupado"* | Dos personas escribiendo a la vez. Reintentar en unos segundos |
| *"CONFIG.carpeta_soportes está vacío"* | Corre `instalar()` |
| Los correos llegan a mi bandeja, no a las oficinas | `modo = PRUEBA` en CONFIG. Es el comportamiento correcto hasta que lo cambies |
| El logo sale como un recuadro punteado | Falta `logo_id` en las propiedades del script |
| En la pantalla de carga sale *"Sin pareja"* | El nombre del archivo no tiene el código de oficina o el impuesto, o la obligación está en un estado que ya no admite soporte. Se puede elegir a mano en el desplegable |
| Una obligación no deja subir soporte | Solo se puede en PENDIENTE, LISTA, DEVUELTA o REBOTADO |
| *"Una obligación APROBADA ya es evidencia cerrada"* | Es a propósito: no se edita lo aprobado |

---

## Desarrollo

### Las pruebas

```
node tools/pruebas.mjs
```

178 aserciones sobre las reglas donde un error silencioso se propaga: la
normalización de periodicidad, "sin soporte no hay envío", la normalización de
roles, el reparto del pago en dos columnas, el emparejamiento de la carga masiva
y las métricas. Son funciones puras, así que corren igual en node y dentro de
Apps Script (menú **SINAV → Correr pruebas**).

Ya encontraron errores reales: `normValor('$ 4.820.350')` devolvía vacío porque
leía los puntos de mil como decimales, `armarId` no rellenaba el código DANE a
cinco dígitos, y el correo a las oficinas imprimía una columna que había dejado
de existir.

### Ver la interfaz sin desplegar

```
node tools/mock.mjs      # arma .taste-skill/mock/index.html
```

Usa los archivos reales de `src/ui` con un `google.script.run` de mentiras, y
calcula sus respuestas con las mismas funciones puras del servidor, para que el
mock no pueda decir una cosa distinta de la que dirá Apps Script.

La única excepción: `apiCargaPlan` devuelve siempre el mismo plan de ejemplo sin
mirar los nombres que le pasen. El emparejamiento de verdad lo cubren las
pruebas de `leerNombreArchivo` y `emparejarArchivo`.

---

## Cómo está armado

```
src/
  00_Constantes   esquemas de las hojas, estados, transiciones, permisos, roles
  01_Instalar     instalar() y migrar(), ambos idempotentes + el menú del Sheets
  02_Hojas        lectura y escritura en bloque, LockService, config()
  03_Roles        yo(), puede(), exige(), asegurarAlta() — el rol se resuelve aquí y solo aquí
  04_Normalizar   funciones puras: periodicidad, periodo, códigos, correos, valor, pago
  05_Eventos      el log append-only
  06_Estados      puedePasar(), puedeEnviar(), validarPaso(), aplicar()
  07_Obligaciones listar filtrado por rol, conteos, apiInicio()
  08_Soportes     subir el adjunto a Drive (carpeta por municipio) y pasar a LISTA
  09_Enviar       Gmail, hilo_id, cuota por persona, lotes con guardia de tiempo
  10_WebApp       doGet, include(), apiLogo()
  14_Campos       digitalización manual: apiGuardarCampos(), apiListaCampos()
  15_Carga        carga masiva: leer el nombre del PDF y emparejarlo, apiCargaPlan()
  16_Metricas     apiMetricas() — solo JEFE y ADMIN
  99_Pruebas      pruebas()
  ui/             Index, Estilos, Comun, Enviar, Carga, Campos, Metricas, App
```

Los huecos 11, 12 y 13 están reservados a propósito para Respuestas, Alertas y
Disparadores, que es lo que sigue.

### Lo que falta (en orden)

1. **RESPUESTAS** — `11_Respuestas.gs` + `ui/Respuestas.html`. Busca sobre el
   `hilo_id` guardado al enviar, con `GmailApp.search` acotado a la etiqueta
   `SINAV`. Ahí entran también los disparadores por persona
   (`13_Disparadores.gs`) y el botón "Revisar respuestas ahora".

   **Pendiente de decidir antes de escribirlo:** los requerimientos piden además
   detectar el correo de `noreply@davivienda.com` y adjuntar el soporte de pago
   que indique. Eso **no** pasa por el `hilo_id`: ese remitente manda un correo
   nuevo, no una respuesta al hilo, así que hace falta otro mecanismo de
   emparejamiento leyendo el cuerpo del mensaje. Sin un ejemplo real de ese
   correo no se puede diseñar.
2. **ALERTAS** — `12_Alertas.gs` + `ui/Alertas.html`.
3. **Asignación** (JEFE) y **Configuración** (ADMIN). Las pestañas ya están en la
   navegación, con su marco y una línea que dice qué va a ir ahí.

### Si algún día quieren un build de verdad

El camino es **Vite + clasp**: el código de `src/ui` pasa a módulos, Vite arma un
bundle y `clasp push` lo sube. Hoy no, por el plazo: React 18 + htm desde CDN no
necesita compilar nada y se pega directo en el editor.

---

## Decisiones que conviene no deshacer

- **`modo = PRUEBA`** manda todos los correos al propio usuario. Es el valor por
  defecto y el código nunca lo cambia. Para producción se edita a mano en CONFIG.
- **El `hilo_id` se guarda en el envío**, buscando el hilo por una marca ASCII en
  el asunto (`SINAV-05001-RETEICA-GENERAL-2026-09`) con `in:sent`. Si no lo
  encuentra, la fila queda sin `hilo_id` y se escribe un ERROR en EVENTOS, porque
  sin eso la respuesta no se detecta sola.
- **Sin soporte no hay envío**, en dos puntos: no se puede llegar a `LISTA` sin
  `soporte_id`, y `apiEnviar` vuelve a verificarlo antes de cada correo. En la
  interfaz la casilla de esas filas está apagada.
- **Los códigos son texto.** `cod_dane`, `cod_oficina`, `periodo`, `nit_municipio`,
  `soporte_id`, `hilo_id` y `sellado_id` tienen formato `@` en la hoja.
- **Nada de fórmulas vivas en el maestro.** Los valores se copian al crear la fila.
- **El NIT es del municipio**, no del banco. La columna se llama `nit_municipio`.
- **Las columnas nuevas van al final.** Insertarlas en la mitad desalinea los
  datos que ya están escritos.
- **Cuando la carga masiva duda, no elige.** Un soporte en la obligación
  equivocada se descubre cuando la oficina recibe la declaración de otro
  municipio.

## Lo que hay que reemplazar antes de producción

- **El logo.** Sube el archivo oficial a Drive y pon su id en **Configuración del
  proyecto → Propiedades del script → `logo_id`**. Es cableado del despliegue, no
  un parámetro del negocio, así que no ocupa una fila de CONFIG que los usuarios
  ven. Se acepta el id o el enlace completo, y la cuenta que despliega tiene que
  poder ver el archivo (los usuarios finales no necesitan permiso). Se sigue
  leyendo `CONFIG.logo_id` como respaldo. Mientras no haya id, la interfaz
  muestra el espacio reservado punteado.
- **Las tres filas de prueba** de `instalar()` y su soporte `.txt` en Drive,
  incluidos los correos `oficina.*@davivienda.com`, que son inventados.
- **`modo`** en CONFIG, que sale en `PRUEBA`.

Las columnas `motivo_devuelta`, `estado_previo` y `reprocesos` no estaban en la
lista original: las exige la máquina de estados, que tiene que guardar desde qué
estado volvió una DEVUELTA y contar reprocesos.
