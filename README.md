# SINAV

Control de obligaciones tributarias territoriales · Departamento de Impuestos,
Banco Davivienda. Google Sheets + Apps Script + una aplicación web.

Contexto de producto en [PRODUCT.md](PRODUCT.md). Decisiones visuales en
[DESIGN.md](DESIGN.md).

---

## Lo primero: qué funciones se ejecutan

Son **tres**, y las tres viven en el menú **SINAV** que aparece dentro del
Sheets. No hace falta abrir el editor de Apps Script para el día a día.

| Función | Cómo se corre | Cuándo |
|---|---|---|
| `instalar()` | Menú **SINAV → Instalar / verificar** | La primera vez, y **cada vez que actualices el código** |
| `migrar()` | Menú **SINAV → Migrar columnas** | Una sola vez, **después** de `instalar()`, si el libro ya tenía filas |
| `pruebas()` | Menú **SINAV → Correr pruebas** | Cuando cambies código o algo huela raro |

En Apps Script las tres viven en **`Codigo`**, porque todo el código va en un
solo archivo (ver [Qué se pega en Apps Script](#qué-se-pega-en-apps-script)).
En este repo el código está repartido en `src/` para poder trabajarlo:
`instalar()` y `migrar()` están en `src/01_Instalar.gs` y `pruebas()` en
`src/99_Pruebas.gs`.

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

### Y dos más, en el menú `SINAV · Carga`

Solo aparecen si pegaste `dist/Carga.gs`, y solo las puede correr el `ADMIN`.
Se usan cuando entra una vigencia nueva, no en el día a día.

| Función | Cómo se corre | Cuándo |
|---|---|---|
| `cargarProgramacion()` | **SINAV · Carga → 1 · Cargar PROGRAMACION** | Una vez. Lee la hoja CALENDARIO y deja las reglas en PROGRAMACION |
| `generarVigencia()` | **SINAV · Carga → 2 · Generar la vigencia actual** | Después de la anterior. Crea las obligaciones del año |

`generarVigencia()` **se reanuda sola**: son más de seis mil filas y Apps Script
corta a los 6 minutos. Si te dice que quedaron pendientes, vuelve a darle y
sigue donde iba. Lo ya escrito no se duplica.

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

<a id="qué-se-pega-en-apps-script"></a>

Son **tres archivos**, los de la carpeta `dist/`:

| Archivo que creas en el editor | Qué pegas dentro | Tipo |
|---|---|---|
| `Codigo` | `dist/Codigo.gs` | Secuencia de comandos (.gs) |
| `Index` | `dist/Index.html` | HTML |
| `appsscript.json` | `dist/appsscript.json` | Manifiesto |

Nada más. **No** hay que crear `00_Constantes`, `01_Instalar`, `ui/App` ni los
otros veintiuno: `dist/Codigo.gs` ya los trae todos unidos en el orden correcto,
y `dist/Index.html` trae toda la interfaz.

Para ver `appsscript.json` en el editor hay que activar **Configuración del
proyecto → Mostrar el archivo de manifiesto "appsscript.json"**.

> **Por qué así.** Antes había que crear veinticuatro archivos con nombres
> exactos y en el orden correcto. Si uno quedaba mal nombrado o en otra
> posición, el proyecto reventaba con `ReferenceError: ESTADO is not defined`,
> un mensaje que no dice cuál es el archivo culpable. Con tres archivos ese
> error deja de ser posible.

`dist/` se genera a partir de `src/` con `npm run build`, y está commiteado en
el repo para que puedas copiarlo directo desde GitHub sin instalar nada.

**`dist/` no se edita a mano.** Se edita `src/` y se corre `npm run build`.

### 2b · Si tu proyecto ya quedó hecho un lío

Si ya pegaste los archivos sueltos y te sale `ReferenceError`, no intentes
arreglarlo archivo por archivo. Empieza limpio:

1. En el editor, **borra todos los archivos** de Secuencia de comandos y HTML
   que tengas. Deja solo `appsscript.json`.
2. Crea `Codigo` y pega `dist/Codigo.gs`.
3. Crea `Index` (tipo HTML) y pega `dist/Index.html`.
4. Guarda y vuelve al Sheets.

No pierdes nada: todo el código vive en este repo, y los datos están en el
Sheets, no en el script.

### 3 · Correr `instalar()`

Menú **SINAV → Instalar / verificar**. La primera vez Google va a pedirte
autorizar permisos (Sheets, Drive, Gmail): acepta.

Si todavía no ves el menú SINAV, cierra y vuelve a abrir el Sheets, o corre
`instalar` desde el editor eligiéndola en el desplegable de funciones (está en
`Codigo`, junto con todas las demás).

Esto deja hecho, en este orden:

1. **Las seis hojas** con sus encabezados, formatos y fila congelada:
   CONFIG, USUARIOS, ROLES, VIGENCIAS, OBLIGACIONES y EVENTOS.
2. **La hoja VIGENCIAS** con los ids REALES de las carpetas de Drive que el
   equipo ya tiene creadas. **No crea ninguna carpeta** (ver
   [Las carpetas de Drive](#las-carpetas-de-drive)).
3. **Los parámetros base de CONFIG**, con `modo = PRUEBA`.
4. **La hoja ROLES**, que describe qué puede cada rol.
5. **Tu correo inscrito como ADMIN** en USUARIOS.
6. **Las listas desplegables** en las columnas que se llenan a mano.
7. **La etiqueta `SINAV` de Gmail.**
8. **Tres filas de prueba** en OBLIGACIONES, con su soporte en Drive.

### 4 · Correr `migrar()`

Menú **SINAV → Migrar columnas**. Hace falta siempre que vengas de una versión
anterior, aunque creas que el libro está limpio: además de repartir columnas,
convierte el rol `JEFE`, que ya no existe, en `PROFESIONAL` nivel `III`.

Si acabas de crear el libro de cero, sáltatelo.

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

Lo que decide los permisos es el **perfil**: el rol y, para los profesionales,
también el nivel. El rol `JEFE` ya no existe.

| Perfil | Quién lo tiene | Qué puede hacer |
|---|---|---|
| `PROFESIONAL-I` | Por defecto, cualquier correo nuevo | Sus propias obligaciones: subir soportes (uno o en lote), digitalizar los campos manuales y enviar a las oficinas. Las ajenas las ve, no las toca |
| `PROFESIONAL-II` | A mano | Lo mismo que el I |
| `PROFESIONAL-III` | El cargo de supervisión del equipo. Hoy Elizabeth. A mano | Todo lo del profesional sobre **cualquier** obligación, más asignar responsables, dar el visto bueno (REVISADA / APROBADA), devolver con motivo, ver las métricas, registrar ausencias y habilitar vigencias |
| `ADMIN` | Quien administra la herramienta. Uno solo | Todo lo anterior, más editar CONFIG y USUARIOS |

Los permisos están atados al **perfil, nunca al nombre de una persona**: si
mañana el cargo lo ocupa otra, se le cambia el nivel en USUARIOS y ya.

La validación se hace **en el servidor**, no escondiendo botones: `validarPaso()`
recibe el perfil ya resuelto, y una llamada directa a la API con otro perfil se
rechaza igual.

### La hoja USUARIOS

| Columna | Qué va | Obligatoria |
|---|---|---|
| `correo` | El corporativo, en minúsculas | Sí |
| `nombre` | Como se muestra en la interfaz | No (se deduce del correo) |
| `rol` | `PROFESIONAL` o `ADMIN` | Sí |
| `activo` | `SI` o `NO` | Sí |
| `area` | `MUNICIPALES` | No |
| `nivel` | `I`, `II` o `III`. Vacío cuenta como `I` | Solo para profesionales |

**El `nivel` sí decide permisos**, desde el REQ-012: `PROFESIONAL-III` es el
cargo de supervisión. El `I` y el `II` pueden lo mismo entre sí. Un profesional
**sin nivel cae al `I`**, que es el de menos permisos: ante la duda, nunca de
más. El `area` se guarda y se muestra, pero no cambia nada.

Todo eso vive en `PERMISO`, en `00_Constantes.gs`, y en ningún otro sitio.

`area` y `nivel` están **al final** de la hoja a propósito. Ver [Migrar un libro
que ya existe](#migrar-un-libro-que-ya-existe).

### Cómo poner a alguien de PROFESIONAL-III

1. Abre la hoja **USUARIOS**.
2. Busca la fila de su correo. Si no está, que entre una vez a la aplicación y
   aparece sola.
3. Deja `rol` en `PROFESIONAL` y pon `nivel` en `III`. Las dos celdas son
   desplegables.
4. Listo. **No hay que correr nada**: el perfil se lee en cada entrada. Si la
   persona tiene la aplicación abierta, que recargue.

Para `ADMIN`, cambia `rol` a `ADMIN` y deja `nivel` vacío.

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
| **ROLES** | Solo referencia: qué puede cada perfil. `instalar()` la reescribe | El programa |
| **VIGENCIAS** | Una fila por año fiscal, con los ids de sus carpetas de Drive | `instalar()` la siembra; después, a mano o `habilitarVigencia()` |
| **OBLIGACIONES** · `responsable` | El correo corporativo de quien responde. Vacío = sin asignar, sale en Asignación | El importador y la pestaña Asignación |
| **CALENDARIO** | Donde se pega la hoja del Excel del equipo. **No la borres**: `generarVigencia()` saca de ahí las fechas | Tú, pegando |
| **PROGRAMACION** | Quién debe qué y cada cuánto. 1.217 reglas que NO cambian de un año a otro | `cargarProgramacion()` |
| **AUSENCIAS** | Una fila por ausencia registrada. No se borran: son trazabilidad | La pestaña Ausencias |
| **OBLIGACIONES** | El maestro. Una fila por obligación y periodo | El programa y la pantalla de digitalización |
| **EVENTOS** | El log, solo se agrega al final | **Solo** el programa |

**EVENTOS no se edita a mano nunca.** Es la evidencia de qué pasó y cuándo.

---

## Quién responde por cada obligación

La distribución no se inventa: sale de los archivos que entregó el equipo, con
reglas explícitas y en este orden. Donde las fuentes se contradicen, **manda la
regla, no la interpretación**.

### Las tres fuentes

| Fuente | Qué aporta | Clave |
|---|---|---|
| Los cuatro archivos individuales | Lo que cada profesional declara como suyo | centro de costo |
| Hoja `Responsable` del calendario | **Solo las mixtas**: municipios que dos personas se reparten | centro de costo |
| `CALENDARIO_TRIBUTARIO` | Los municipios y sus vencimientos | código DANE |

La hoja `Responsable` **no es la distribución completa**, es la de las mixtas.
Tomarla como distribución total dejaba a Helen con cero municipios y a Jesús
con dos, lo que obviamente no era el reparto real del equipo.

### Las reglas, en orden

1. **Exclusiva.** Si un solo profesional declara un municipio en su archivo, es
   suyo.
2. **Mixta.** Si dos lo comparten, la responsabilidad recae **siempre en Andrea
   o en Liliana**, que es la regla que dio el equipo. Funciona porque ninguna
   pareja mixta es Andrea + Liliana: siempre hay exactamente una de las dos.
3. **Hoja oficial.** Lo que la hoja `Responsable` asigna sin conflicto se
   respeta tal cual.

El resultado son **329 claves con responsable y ninguna sin resolver**: 325
municipios y 4 entidades.

### El centro de costo es la clave, no el nombre

El `CC` (columna `cod_oficina`) identifica sin ambigüedad: cero conflictos en
toda la matriz. El **nombre no sirve** como clave — hay municipios homónimos en
departamentos distintos (Sucre, Armenia, Florencia) y los archivos escriben el
mismo sitio de varias formas (`PALMIRA`, `PALMIRA F`, `MELGAR - AUTORETENEDOR`).

El archivo de Jesús no traía columna de CC, así que sus municipios se
resolvieron por nombre contra el calendario. Diez no aparecen ahí y hay que
revisarlos a mano.

### Las entidades no son municipios

Cuatro de las obligaciones de Bogotá son **entidades**, no municipios:
Corporación Financiera, Inversiones CFD, Renting Davivienda y VC Investments.
Van en la columna `entidad`, no en `municipio`, para que sus declaraciones no
se mezclen con las del banco y se puedan filtrar aparte.

### Cuando entre una obligación nueva

Si llega un municipio, exógena o declaración que todavía no tiene responsable,
queda **sin dueño** y le aparece al `PROFESIONAL-III` en la pestaña
**Asignación**, que es donde se reparte a mano. No se adivina un responsable
por parecido de nombre.

## Cómo nombrar los PDF

Esto es lo que hay que decirle al equipo. La carga masiva lee el nombre del
archivo y propone a qué obligación va cada uno.

```
11001 RETEICA 2026-11.pdf
05001 AUTORRETEICA 2026-11.pdf
76001 ICA 2026-B6.pdf
11001 EXOGENA 2026.pdf
```

| Parte | Qué va | Obligatorio |
|---|---|---|
| **Código DANE** | 5 dígitos. Está en la columna `cod_dane` de OBLIGACIONES | Sí |
| **Impuesto** | `RETEICA`, `AUTORRETEICA`, `ICA` o `EXOGENA` | Sí |
| **Periodo** | `2026-11`, `2026-B6`, `2026`. Se elige en pantalla igualmente | No |

**El orden da igual**, y los separadores también: espacios, guiones o guiones
bajos. El texto de más se ignora. Todos estos funcionan:

```
11001-RETEICA-2026-11.pdf
RETEICA 11001.pdf
Declaracion 05001 AUTORRETEICA MEDELLIN 2026-11.pdf
```

Se acepta también el **código de oficina** de 3 o 4 dígitos, pero solo algunas
obligaciones lo tienen: el calendario no trae esa columna. **El DANE lo tienen
todas**, así que es el que conviene usar.

Si falta el DANE pero el impuesto y el periodo dejan una sola candidata, también
empareja. **Cuando hay duda no elige**: lo deja en un desplegable para que la
persona decida. Un soporte en la obligación equivocada se descubre cuando la
oficina recibe la declaración de otro municipio.

## La ventana de trabajo

El libro tiene el año entero: más de seis mil obligaciones. Decorarlas todas y
mandarlas al navegador en cada pantalla la ponía lenta, y llenaba la lista de
vencimientos de hace meses que nadie va a trabajar hoy.

Por eso se filtra **antes** de procesar, y **por defecto se ve el mes en
curso**: en noviembre, noviembre.

El selector de la pestaña ENVIAR trae el conteo de cada opción al lado, para que
no se esconda nada en silencio:

| Ventana | Qué muestra |
|---|---|
| **Este mes** | Lo que vence en el mes en curso. Por defecto |
| Este mes y el siguiente | Para ir preparando lo que viene |
| Vencidas sin cerrar | Lo atrasado que sigue abierto |
| Todo lo abierto | Todo lo que no está APROBADA |
| El año entero | Las seis mil. Para cuando de verdad haga falta |

**Alertas** y **Asignación** usan *todo lo abierto* a propósito: una alerta tiene
que incluir lo ya vencido que sigue sin cerrar, y para repartir hay que ver todo
lo que no está cerrado. **Métricas** usa el año entero, que son agregados.

## Las respuestas de las oficinas

Al enviar, SINAV guarda el **`hilo_id`** de Gmail. La pestaña **Respuestas** lee
**ese hilo y nada más**: si la oficina contesta sobre el mismo correo, se recoge
lo que respondió y el adjunto que traiga.

**Por qué el hilo y no una búsqueda en la bandeja:** el hilo ya dice a qué
obligación pertenece la respuesta. Buscar por asunto o por remitente sería
adivinar, y una declaración sellada archivada en el municipio equivocado es un
error que se descubre meses después.

### Qué hace el botón «Revisar respuestas ahora»

1. Recorre las obligaciones enviadas que tengan `hilo_id`.
2. Abre cada hilo y mira **solo los mensajes nuevos** — los que llegaron después
   del último que ya se procesó. Para eso está la columna `ultimo_mensaje`: sin
   ella, cada revisión volvería a guardar el mismo adjunto.
3. Descarta los mensajes propios: una respuesta es de la oficina, no mía.
4. El adjunto se guarda en **Sellados**, en la carpeta del municipio y el
   impuesto, y su id queda en `sellado_id`.
5. La obligación pasa de `ENVIADA` a `RESPONDIDA` y queda el evento.

Los adjuntos de menos de 2 KB se ignoran: son firmas y logos incrustados, no el
sellado.

Va **por lotes con guardia de tiempo**: cada llamada a Gmail es lenta y Apps
Script corta a los 6 minutos. Si queda a medias, se vuelve a darle y sigue donde
iba, sin repetir lo ya procesado.

### Desde la pantalla

Las enviadas salen en tres grupos: **con sellado guardado**, **respondieron sin
adjunto** y **sin respuesta todavía**. El sellado se abre desde ahí con un
botón, sin ir a buscarlo a Drive; las que no tienen sellado ofrecen abrir el
hilo en Gmail.

**Cada quien revisa lo suyo.** El correo está en la bandeja de quien envió, y la
aplicación corre como el usuario que accede, así que solo se revisan los hilos
propios.

## Ausencias y backups

Cuando alguien se va de vacaciones, sus obligaciones pasan temporalmente a su
backup. Solo lo maneja el **PROFESIONAL-III** (y el ADMIN), desde la pestaña
**Ausencias**.

| Se ausenta | Lo cubre |
|---|---|
| Jesús Jaimes | Helen Cuadros |
| Helen Cuadros | Jesús Jaimes |
| Andrea Galvis | Liliana Ramírez |
| Liliana Ramírez | Andrea Galvis |

Elizabeth no tiene backup: cuando ella falta, cada quien se encarga de lo suyo.
Eso es otro asunto (REQ-013, todavía sin construir).

### Cómo se registra

1. Elegir quién se ausenta y las fechas.
2. **Ver qué se movería** — muestra cuántas obligaciones caen en ese rango,
   repartidas por impuesto, con ejemplos.
3. Un modal pide confirmación explícita antes de tocar nada.
4. Al confirmar, esas obligaciones pasan al backup.

### Tres cosas que no se negocian

- **La asignación original no se pierde.** El `responsable` pasa a ser el
  backup, pero en `titular_original` queda a quién hay que devolvérsela. Sin
  eso, al volver de vacaciones nadie sabría de quién era cada cosa.
- **Solo se mueve lo que VENCE dentro del rango.** Lo que vence después sigue
  siendo del titular: no está de vacaciones cuando toque trabajarlo.
- **La devolución conserva lo hecho.** Si el backup subió el soporte y envió,
  la obligación vuelve con su soporte y su envío. Se devuelve la propiedad, no
  se deshace el trabajo.

### El regreso

Automático. Al entrar a la aplicación, SINAV devuelve lo de las ausencias cuya
fecha final ya pasó. No hace falta un disparador: solo importa justo antes de
que alguien mire la pantalla.

También se puede **cancelar** una ausencia en curso desde el historial, y todo
vuelve de inmediato.

La hoja **AUSENCIAS** guarda cada una con sus fechas, cuántas obligaciones
movió y quién la registró. No se borran: son la trazabilidad de por qué una
obligación cambió de manos.

## Las carpetas de Drive

SINAV se cuelga de la estructura que el equipo ya organizó a mano. **No crea
ninguna carpeta de año**, y nunca reemplaza un id que ya esté guardado.

```
Territoriales / <vigencia> / Exógenas
                           / Declaraciones / Soportes / <municipio> / <impuesto>
                                           / Sellados / Soportes
```

Los ids viven en la hoja **VIGENCIAS**, una fila por año. `instalar()` siembra
la de 2026 con los ids reales y después no la vuelve a tocar.

Si una carpeta no responde, SINAV **avisa con el id** en vez de crear otra:
crear una carpeta nueva partiría en dos el archivo del equipo sin que nadie se
entere.

### Vigencia fiscal, no año de presentación

El equipo trabaja por año vencido: en 2027 se presentan las obligaciones de la
vigencia 2026. Son tres cosas distintas:

| | |
|---|---|
| **vigencia fiscal** | a qué año pertenece la obligación → **decide la carpeta** |
| año de presentación | cuándo se presenta |
| fecha de envío | cuándo SINAV mandó el correo |

La columna `vigencia` de OBLIGACIONES manda. Una declaración de 2026 presentada
en 2027 se guarda en `Territoriales/2026`.

### Habilitar un año nuevo

`habilitarVigencia("2027")`, que solo puede un `PROFESIONAL-III` o el `ADMIN`.
Crea la estructura del año bajo Territoriales, guarda sus ids en VIGENCIAS y
**no toca las vigencias anteriores**. Si el año ya estaba, no hace nada.

### Las entidades

Bogotá tiene más entidades además del banco (la Corporación Financiera, entre
otras). La columna `entidad` de OBLIGACIONES las distingue: **vacío significa
BANCO DAVIVIENDA S.A**, que es el caso de casi todas. Así sus declaraciones no
se mezclan sin tener que duplicar el municipio.

## Migrar un libro que ya existe

Menú **SINAV → Migrar columnas**, o la función `migrar()`.

**El orden importa:** primero **Instalar / verificar**, que agrega las columnas
nuevas, y después **Migrar columnas**, que reparte los datos. Al revés no
funciona, y `migrar()` te lo dice en vez de hacer un desastre.

Qué cambió y por qué es seguro:

- **El rol `JEFE` desapareció (REQ-012).** `migrar()` reescribe esas filas como
  `PROFESIONAL` con `nivel` `III`, que es el cargo de supervisión. El nivel se
  fuerza aunque la celda ya traiga otro valor: si no, quien era jefe perdería
  permisos sin que nadie se diera cuenta. Mientras no migres, una fila que diga
  `JEFE` se sigue leyendo como `PROFESIONAL-III`, así que nadie queda fuera.

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
| `ReferenceError: ESTADO is not defined` (o `HOJA`, `COLS`, `ROL`…) | Tienes los archivos sueltos en vez del paquete. Haz el [paso 2b](#2b--si-tu-proyecto-ya-quedó-hecho-un-lío): borra todo y pega los tres de `dist/` |
| No encuentro la función `instalar` en el desplegable | `Codigo` no está en el proyecto, está vacío o tiene un error de sintaxis. El desplegable solo lista funciones de archivos que cargaron bien |
| Tengo `instalar()` en un archivo que no es `Codigo` | Pegaste los archivos sueltos y alguno quedó con el contenido de otro. Paso 2b |
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

Los comandos:

```
npm run build     # regenera dist/ a partir de src/
npm test          # corre las pruebas y luego el build
npm run mock      # arma la interfaz para verla en el navegador
```

No hay dependencias que instalar: todo usa node a secas.

### El build

```
npm run build
```

Une `src/*.gs` en `dist/Codigo.gs` y `src/ui/*.html` en `dist/Index.html`,
resolviendo los `include()`. Antes de escribir nada comprueba que el resultado
compile, que no reviente al cargar, que no haya dos funciones con el mismo
nombre (al unir archivos una pisaría a la otra en silencio) y que `instalar`,
`migrar`, `pruebas`, `onOpen` y `doGet` estén ahí.

**Corre `npm run build` y commitea `dist/` cada vez que toques `src/`**, o lo
que se pega en Apps Script queda viejo.

### Las pruebas

```
npm test
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

Y alrededor:

```
build.js          une src/ en dist/
dist/             lo UNICO que se pega en Apps Script (3 archivos). Autogenerado
tools/pruebas.mjs las pruebas
tools/mock.mjs    arma la interfaz para verla sin desplegar
```

El código vive repartido en `src/` porque así se puede leer y probar por
partes, pero **Apps Script recibe un solo archivo**: así el orden de carga deja
de ser un problema y pegar el código es copiar tres cosas, no veinticuatro.

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
