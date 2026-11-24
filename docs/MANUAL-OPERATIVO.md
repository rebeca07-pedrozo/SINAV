# SINAV · manual operativo

Todo lo que hay que hacer para poner SINAV a andar, mantenerlo y arreglarlo
cuando algo falla. La presentación del programa —qué es, cómo está armado y por
qué— está en el [README](../README.md).

- [1 · Las funciones que se ejecutan](#1--las-funciones-que-se-ejecutan)
- [2 · Puesta en marcha, paso a paso](#2--puesta-en-marcha-paso-a-paso)
- [3 · La carga mensual y su activador](#3--la-carga-mensual-y-su-activador)
- [4 · Migrar un libro que ya existe](#4--migrar-un-libro-que-ya-existe)
- [5 · Usuarios y roles, en el día a día](#5--usuarios-y-roles-en-el-día-a-día)
- [6 · Ausencias y backups](#6--ausencias-y-backups)
- [7 · Las respuestas de las oficinas](#7--las-respuestas-de-las-oficinas)
- [8 · Lo que hay que vigilar](#8--lo-que-hay-que-vigilar)
- [9 · Si algo sale mal](#9--si-algo-sale-mal)
- [10 · Desarrollo](#10--desarrollo)
- [11 · Antes de pasar a producción](#11--antes-de-pasar-a-producción)

**Si solo vas a leer una sección, lee [Lo que hay que
vigilar](#8--lo-que-hay-que-vigilar).**

---

## 1 · Las funciones que se ejecutan

Son **tres**, y las tres viven en el menú **SINAV** que aparece dentro del
Sheets. No hace falta abrir el editor de Apps Script para el día a día.

| Función | Cómo se corre | Cuándo |
|---|---|---|
| `instalar()` | Menú **SINAV → Instalar / verificar** | La primera vez, y **cada vez que actualices el código** |
| `migrar()` | Menú **SINAV → Migrar columnas** | Una sola vez, **después** de `instalar()`, si el libro ya tenía filas |
| `pruebas()` | Menú **SINAV → Correr pruebas** | Cuando cambies código o algo huela raro |

Las tres son **idempotentes**: correrlas dos veces no duplica ni rompe nada.

En Apps Script viven en **`Codigo`**, porque todo el código va en un solo
archivo. En el repo están repartidas: `instalar()` y `migrar()` en
`src/01_Instalar.gs`, `pruebas()` en `src/99_Pruebas.gs`.

Hay una cuarta, `onOpen()`, que **nunca se corre a mano**: Google la llama sola
al abrir el libro y es la que pinta el menú.

### El archivo abierto en el editor da igual

Esto confunde a todo el mundo la primera vez. En Apps Script **no se corre «la
función del archivo que tienes abierto»**. Todos los archivos comparten un solo
ámbito global, así que cualquier función es visible desde cualquier parte.

Lo que manda es **el desplegable de funciones** de la barra de arriba, al lado
del botón **Ejecutar**: lista las funciones de *todo* el proyecto. Eliges
`instalar` ahí y le das a Ejecutar, sin importar qué archivo estés viendo.

Y más fácil todavía: **usa el menú SINAV dentro del Sheets** y olvídate del
editor. Si el menú no aparece, cierra y vuelve a abrir el libro.

### Las de carga, en sus dos menús

Solo aparecen si pegaste `dist/Carga.gs` y `dist/Mensuales.gs`, y solo las puede
correr el `ADMIN`.

**`SINAV · Carga`** — una vez por vigencia, no en el día a día:

| Función | Cómo se corre | Cuándo |
|---|---|---|
| `cargarProgramacion()` | **SINAV · Carga → 1 · Cargar PROGRAMACION** | Una vez. Lee la hoja CALENDARIO y deja las reglas en PROGRAMACION |
| `generarVigencia()` | **SINAV · Carga → 2 · Generar la vigencia actual** | Solo si de verdad quieres el año entero en el libro. Normalmente **no**: usa la carga mensual |

**`SINAV · Mes`** — es la que se usa de verdad:

| Función | Cómo se corre | Cuándo |
|---|---|---|
| `cargarMesVigente()` | **SINAV · Mes → Cargar el mes en curso y el siguiente** | Lo hace el activador el día 1. A mano, cuando quieras adelantarlo |
| `instalarCargaMensual()` | **SINAV · Mes → Programar la carga mensual** | Una vez, para dejar el activador puesto |
| `refrescarCorreos()` | **SINAV · Mes → Refrescar los correos de oficina** | Cada vez que el equipo llene correos en PROGRAMACION |
| `arreglarExogena()` | **SINAV · Mes → Arreglar EXOGENA** | Una vez, si el libro se cargó cuando EXOGENA nacía como `REVISAR` |
| `archivarCerradas()` | **SINAV · Mes → Archivar los meses cerrados** | Cuando el libro se vaya poniendo pesado |

Y en el menú **SINAV**:

| Función | Cómo se corre | Cuándo |
|---|---|---|
| `porQueNoSeEnvia()` | **SINAV → ¿Por qué no se envía?** | Cuando una fila con soporte no se deja enviar |
| `revisarAntesDeProduccion()` | **SINAV → Revisar antes de producción** | Antes de dar el paso. No cambia nada |
| `pasarAProduccion()` | **SINAV → PASAR A PRODUCCIÓN** | Una vez, el día del lanzamiento |

Las dos cargas **se reanudan**: Apps Script corta a los 6 minutos, y si te dicen
que quedó algo pendiente, vuelves a darle y sigue. Nada se duplica, porque el id
de la obligación sale de sus datos y no de un contador.

Todas las demás funciones empiezan por `api…` (`apiInicio`, `apiEnviar`,
`apiSubirSoporte`, `apiMetricas`…). Esas **las llama la aplicación web**, no tú.
Correrlas a mano no sirve de nada: esperan argumentos del navegador y devuelven
datos para pintar una pantalla.

---

## 2 · Puesta en marcha, paso a paso

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
el repo para poder copiarlo directo desde GitHub sin instalar nada.

**`dist/` no se edita a mano.** Se edita `src/` y se corre `npm run build`.

### 2b · Si tu proyecto ya quedó hecho un lío

Si ya pegaste los archivos sueltos y sale `ReferenceError`, no intentes
arreglarlo archivo por archivo. Empieza limpio:

1. En el editor, **borra todos los archivos** de Secuencia de comandos y HTML.
   Deja solo `appsscript.json`.
2. Crea `Codigo` y pega `dist/Codigo.gs`.
3. Crea `Index` (tipo HTML) y pega `dist/Index.html`.
4. Guarda y vuelve al Sheets.

No se pierde nada: todo el código vive en el repo, y los datos están en el
Sheets, no en el script.

### 3 · Correr `instalar()`

Menú **SINAV → Instalar / verificar**. La primera vez Google pide autorizar
permisos (Sheets, Drive, Gmail): acepta.

Si todavía no ves el menú SINAV, cierra y vuelve a abrir el Sheets, o corre
`instalar` desde el editor eligiéndola en el desplegable de funciones.

Esto deja hecho, en este orden:

1. **Las seis hojas** con sus encabezados, formatos y fila congelada:
   CONFIG, USUARIOS, ROLES, VIGENCIAS, OBLIGACIONES y EVENTOS.
2. **La hoja VIGENCIAS** con los ids REALES de las carpetas de Drive que el
   equipo ya tiene creadas. **No crea ninguna carpeta.**
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

Si acabas de crear el libro de cero, sáltatelo. El detalle está en
[Migrar un libro que ya existe](#4--migrar-un-libro-que-ya-existe).

### 5 · Desplegar la aplicación web

**Implementar → Nueva implementación → Aplicación web**:

- **Ejecutar como:** `Usuario que accede a la aplicación web` ← **esto no es opcional**
- **Quién tiene acceso:** `Cualquier usuario de Banco Davivienda`

Es lo que hace que el correo salga de la cuenta de quien envía y que la
respuesta vuelva a SU bandeja. Con «Ejecutar como: yo», todos los correos
saldrían de tu cuenta y las respuestas llegarían a tu bandeja.

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

El de Elizabeth y los de administración. Ver
[Usuarios y roles](#5--usuarios-y-roles-en-el-día-a-día).

### 9 · Cuando vayas a producción

**No edites `modo` a mano.** Usa **SINAV → PASAR A PRODUCCIÓN**, que antes te
muestra lo que está a punto de salir y se niega si queda algo de prueba. El
detalle está en [Antes de pasar a
producción](#11--antes-de-pasar-a-producción).

---

## 3 · La carga mensual y su activador

OBLIGACIONES no guarda el año: guarda **el mes en curso y el siguiente**, del
orden de mil filas. El día 1 de cada mes entra el mes nuevo, solo.

**El criterio es la fecha de vencimiento, no el periodo.** Una declaración del
periodo de octubre que vence el 18 de noviembre entra en noviembre, que es
cuando toca presentarla.

### Dejar el activador puesto

Una sola vez, y lo hace el `ADMIN`:

1. Pega `dist/Mensuales.gs` en el editor como un archivo nuevo llamado
   `Mensuales` (**+ → Script**, y le pones el nombre).
2. Cierra y vuelve a abrir el Sheets, para que salga el menú **SINAV · Mes**.
3. **SINAV · Mes → Programar la carga mensual (día 1)**. La primera vez Google
   pide permisos: acéptalos.
4. Comprueba que quedó: **SINAV · Mes → ¿Está programada?**. Tiene que decir
   *Programada*.
5. Carga el mes de hoy sin esperar al día 1: **SINAV · Mes → Cargar el mes en
   curso y el siguiente**.

Desde ahí, el **día 1 de cada mes entre 5 y 6 de la mañana** (hora del libro)
se cargan solos el mes que entra y el siguiente. Google garantiza la franja, no
el minuto exacto.

**Lo corre la cuenta que lo instaló**, no quien abra el libro. Por eso lo
instala el `ADMIN`: si esa cuenta se desactiva, el activador deja de correr y
hay que volver a programarlo desde otra.

Para ver que de verdad corrió: en el editor, **Ejecuciones** (el icono del
reloj a la izquierda). Y en la hoja EVENTOS queda un `AVISO` por cada carga,
firmado como `sistema`.

### Si prefieres hacerlo a mano

`cargarMesVigente()` se puede correr las veces que quieras, y
`generarMes('2026', 11)` carga un mes concreto. Ninguna de las dos duplica nada:
lo que ya está en la hoja se salta.

### Archivar lo viejo

Con los meses, OBLIGACIONES vuelve a crecer. **SINAV · Mes → Archivar los meses
cerrados** mueve a la hoja HISTORICO lo que está `APROBADA` y venció antes de
este mes.

No borra nada y **no toca lo que sigue abierto**, por viejo que sea: una
obligación de marzo sin cerrar se queda en OBLIGACIONES, a la vista, que es
justo donde tiene que estar.

---

## 4 · Migrar un libro que ya existe

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
  porque buscar carpetas es lo lento de una carga de cuarenta PDF. `migrar()`
  **no mueve** los archivos que ya estaban: se quedan donde están y sus enlaces
  siguen funcionando. Solo los nuevos van a la carpeta del municipio.

---

## 5 · Usuarios y roles, en el día a día

El rol se resuelve **en el servidor**, con `Session.getActiveUser().getEmail()`
contra la hoja USUARIOS. Nunca se confía en lo que mande el navegador.

### La hoja USUARIOS

| Columna | Qué va | Obligatoria |
|---|---|---|
| `correo` | El corporativo, en minúsculas | Sí |
| `nombre` | Como se muestra en la interfaz | No (se deduce del correo) |
| `rol` | `PROFESIONAL` o `ADMIN` | Sí |
| `activo` | `SI` o `NO` | Sí |
| `area` | `MUNICIPALES` | No |
| `nivel` | `I`, `II` o `III`. Vacío cuenta como `I` | Solo para profesionales |
| `backup` | El correo de quien lo cubre cuando se ausenta | No, pero sin él no se puede redistribuir |

**El `nivel` sí decide permisos**, desde el REQ-012: `PROFESIONAL-III` es el
cargo de supervisión. El `I` y el `II` pueden lo mismo entre sí. Un profesional
**sin nivel cae al `I`**, que es el de menos permisos: ante la duda, nunca de
más. El `area` se guarda y se muestra, pero no cambia nada.

Todo eso vive en `PERMISO`, en `00_Constantes.gs`, y en ningún otro sitio.

`area` y `nivel` están **al final** de la hoja a propósito.

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
compartas el libro. Lo que se ahorra es escribir su fila.

Dos cosas que el alta automática **no** hace:

- No toca a un correo que ya esté en la hoja, ni para corregirle el rol.
- **No reactiva** a nadie que tenga `activo = NO`. Si se lo quitaron, fue a
  propósito.

### Cómo quitarle el acceso a alguien

Pon `activo` en `NO` en su fila de USUARIOS. **No borres la fila**: si la
borras, la próxima vez que entre el alta automática la vuelve a crear como
profesional activo.

### Cómo cerrar la lista del todo

Deja `rol_defecto` vacío en CONFIG. A partir de ahí, quien no esté en USUARIOS
no entra, y hay que inscribirlo a mano.

---

## 6 · Ausencias y backups

Cuando alguien se va de vacaciones, sus obligaciones pasan temporalmente a su
backup. Solo lo maneja el **PROFESIONAL-III** (y el ADMIN), desde la pestaña
**Ausencias**.

| Se ausenta | Lo cubre |
|---|---|
| Jesús Jaimes | Helen Cuadros |
| Helen Cuadros | Jesús Jaimes |
| Andrea Galvis | Yasneidy Ramírez |
| Yasneidy Ramírez | Andrea Galvis |

Elizabeth no tiene backup: cuando ella falta, cada quien se encarga de lo suyo.
Eso es otro asunto (REQ-013, todavía sin construir).

### Quién lo decide: la columna `backup` de USUARIOS

**Lo que manda es la hoja.** Cada fila de USUARIOS tiene una columna `backup`
con el correo de quien la cubre. Se edita ahí y no hace falta tocar código
cuando entre o salga alguien del equipo.

Los pares del código son solo el **respaldo**, por si esa columna está vacía, y
`migrar()` la rellena con ellos la primera vez.

Ese respaldo busca por **nombre y apellido**, no solo por el nombre de pila. La
razón es un fallo real: el par de Andrea estaba escrito como «liliana» y la
profesional resultó llamarse **Yasneidy Ramírez**, así que ni Andrea ni ella
tenían backup y la pantalla decía *(sin backup)* para las dos.

### Cómo se registra

1. Elegir quién se ausenta y las fechas.
2. **Ver qué se movería** — muestra cuántas obligaciones caen en ese rango,
   repartidas por impuesto, con ejemplos.
3. Un modal pide confirmación explícita antes de tocar nada.
4. Al confirmar, esas obligaciones pasan al backup.

### Tres cosas que no se negocian

- **La asignación original no se pierde.** El `responsable` pasa a ser el
  backup, pero en `titular_original` queda a quién hay que devolvérsela.
- **Solo se mueve lo que VENCE dentro del rango.** Lo que vence después sigue
  siendo del titular: no está de vacaciones cuando toque trabajarlo.
- **La devolución conserva lo hecho.** Si el backup subió el soporte y envió, la
  obligación vuelve con su soporte y su envío. Se devuelve la propiedad, no se
  deshace el trabajo.

### El regreso

Automático. Al entrar a la aplicación, SINAV devuelve lo de las ausencias cuya
fecha final ya pasó. No hace falta un disparador: solo importa justo antes de
que alguien mire la pantalla.

También se puede **cancelar** una ausencia en curso desde el historial, y todo
vuelve de inmediato.

La hoja **AUSENCIAS** guarda cada una con sus fechas, cuántas obligaciones movió
y quién la registró. No se borran: son la trazabilidad de por qué una obligación
cambió de manos.

---

## 7 · Las respuestas de las oficinas

Al enviar, SINAV guarda el **`hilo_id`** de Gmail. La pestaña **Respuestas** lee
**ese hilo y nada más**.

### Si contestan sin adjuntar nada

Pasa a menudo: la oficina responde con una queja, una pregunta o un «recibido»
y el sellado llega después, en otro correo del mismo hilo.

Eso está cubierto. La obligación pasa a `RESPONDIDA` y **sigue mirando el
hilo**: cada vez que se revisan las respuestas se leen solo los mensajes
nuevos, y el adjunto se guarda cuando aparezca, en el mensaje cinco o en el
quince. Lo que ya se leyó no se vuelve a procesar, porque la columna
`ultimo_mensaje` recuerda dónde iba.

Los adjuntos **se suman**, no se reemplazan: si mandan el sellado y más tarde
el recibo de pago, quedan los dos en la carpeta de Sellados, numerados. La
pantalla dice *«2 documentos guardados»*.

Deja de mirar el hilo cuando la obligación llega a `REVISADA` o `APROBADA`:
ahí ya se cerró y lo que llegue después es otra conversación.

### Qué hace el botón «Revisar respuestas ahora»

1. Recorre las obligaciones enviadas que tengan `hilo_id`.
2. Abre cada hilo y mira **solo los mensajes nuevos** — los que llegaron después
   del último que ya se procesó. Para eso está la columna `ultimo_mensaje`: sin
   ella, cada revisión volvería a guardar el mismo adjunto.
3. Descarta los mensajes propios: una respuesta es de la oficina, no mía.
4. El adjunto se guarda en **Sellados**, en la carpeta del municipio y el
   impuesto, y su id queda en `sellado_id`.
5. La obligación pasa de `ENVIADA` a `RESPONDIDA` y queda el evento.

Los adjuntos de menos de 512 bytes se ignoran: son firmas y logos incrustados,
no el sellado.

Va **por lotes con guardia de tiempo**: cada llamada a Gmail es lenta y Apps
Script corta a los 6 minutos. Si queda a medias, se vuelve a darle y sigue donde
iba, sin repetir lo ya procesado.

### Probar en modo PRUEBA

En `modo = PRUEBA` el correo se manda **a tu propia bandeja** a propósito, así
que cuando respondes para probar, la respuesta también es tuya.

Si se aplicara la regla de producción —descartar los mensajes propios— probar
sería imposible. Por eso **en PRUEBA lo único que se descarta es el primer
mensaje del hilo**, que es el que salió de SINAV; todo lo que venga después
cuenta como respuesta.

En producción vuelve la regla normal.

### Desde la pantalla

Las enviadas salen en tres grupos: **con sellado guardado**, **respondieron sin
adjunto** y **sin respuesta todavía**. El sellado se abre desde ahí con un
botón, sin ir a buscarlo a Drive; las que no tienen sellado ofrecen abrir el
hilo en Gmail.

**Cada quien revisa lo suyo.** El correo está en la bandeja de quien envió, y la
aplicación corre como el usuario que accede, así que solo se revisan los hilos
propios.

---

## 8 · Lo que hay que vigilar

Diez cosas que, si se rompen, rompen SINAV **en silencio**. No dan error: dejan
de funcionar y nadie se entera hasta que una declaración no se presentó.

### 1 · El activador del día 1

Lo corre **la cuenta que lo instaló**, no quien abra el libro. Si esa cuenta se
desactiva o le quitan permisos, **el activador muere y no avisa**: el 1 de
diciembre simplemente no aparecen las obligaciones del mes.

**Cómo se comprueba:** `SINAV · Mes → ¿Está programada?`, y en EVENTOS tiene que
haber un `AVISO` de carga mensual con fecha del día 1. Si no está, se reprograma
desde otra cuenta.

### 2 · Los 217 municipios sin correo de oficina

De los 315 del calendario, solo **98 tienen correo**. Sin correo la obligación
se queda en `LISTA` para siempre: el soporte está cargado, pero no sale nada.

**Cómo se comprueba:** `SINAV → ¿Por qué no se envía?`

Los correos se escriben **en un solo sitio**: PROGRAMACION, columna
`correo_oficina`. Después, **SINAV · Mes → Refrescar los correos de oficina**
baja lo nuevo a las obligaciones que ya existen y siguen abiertas, porque esas
nacieron con el correo vacío y no lo heredan solas.

`refrescarCorreos()` **no pisa** un correo escrito a mano en OBLIGACIONES: si
no coincide con PROGRAMACION, lo reporta y deja que alguien decida. Las
`APROBADA` no se tocan. Se puede correr las veces que haga falta, y de paso
lista los municipios que PROGRAMACION tampoco tiene: esos son los que hay que
averiguar.

### 3 · `modo` en CONFIG

Mientras diga `PRUEBA`, **todos los correos van al propio usuario** y ninguna
alcaldía recibe nada. Es el valor por defecto a propósito, y el código no lo
cambia nunca.

El día del paso se usa **SINAV → PASAR A PRODUCCIÓN**, no la celda: a partir de
ese segundo los correos salen de verdad y **no hay vuelta atrás para lo ya
enviado**. `volverAPruebas()` devuelve el modo, pero no desenvía nada.

### 4 · La cuota de Gmail

Cada persona manda con su propia cuota: **1.500 correos al día** en Workspace,
100 en una cuenta normal. Pasado el tope, Gmail rechaza y la obligación queda
sin enviar.

En un mes de vencimientos fuertes con 500 envíos no hay problema. El riesgo real
es que una sola persona intente mandar todo lo del equipo.

### 5 · Los anexos también se revisan

Una obligación puede llevar varios archivos: *Añadir otro* en su fila. Pero el
visto bueno es **por archivo**, así que si alguien añade un anexo a una
obligación que ya estaba revisada, **el envío se frena otra vez** y la fila
dice *se revisa al enviar*. No es un fallo: es que falta mirar el nuevo.

Topes: 10 archivos por obligación y 24 MB en total, por el límite de Gmail.

En **Carga masiva**, varios archivos para la misma obligación ya no son un
error: el primero de cada obligación reemplaza lo que hubiera y los siguientes
se añaden. Así, volver a subir un archivo corregido sigue reemplazando, y
subir la declaración y su anexo de golpe los deja los dos.

### 6 · `requiere_envio` manda sobre el envío

Si la fila no dice **`SI`**, no se envía, y la fila lo explica: *«marcada como
que no se envía por correo»*. Sale de PROGRAMACION, y ahí es donde se cambia.

Todo nace en `SI`, EXOGENA (medios magnéticos) incluida: se adjunta y se manda
igual que las demás. Si algún municipio concreto no la recibe por correo, se le
pone **`NO`** a mano en su fila de PROGRAMACION y esa deja de enviarse.

En los libros cargados antes de este cambio, EXOGENA nació como `REVISAR`: se
arregla con **SINAV · Mes → Arreglar EXOGENA**, que lo pasa a `SI` en
PROGRAMACION y en las obligaciones abiertas, respetando los `NO` escritos a
mano.

### 7 · El `hilo_id`

Si al enviar no se encuentra el hilo, la fila se queda sin `hilo_id` y se
escribe un `ERROR` en EVENTOS. Esa obligación **nunca va a detectar la respuesta
sola**: hay que archivar el sellado a mano.

**Cómo se comprueba:** buscar `ERROR` en EVENTOS de vez en cuando.

### 8 · Las columnas nuevas van al final

`asegurarHojas()` reescribe la fila 1 **sin mover los datos de abajo**. Insertar
una columna en la mitad desalinea todo lo que ya está escrito: los valores
quedan en la columna de al lado y no hay forma limpia de deshacerlo.

Lo mismo con el orden de `COLS` en `00_Constantes.gs`. Una columna nueva, al
final, siempre.

### 9 · Los códigos son texto, no números

`cod_dane`, `cod_oficina`, `periodo`, `nit_municipio` y los ids de Drive tienen
formato `@` en la hoja. Si alguien los pasa a número, **`05001` se convierte en
`5001`** y deja de emparejar con el calendario: la carga masiva no encuentra el
municipio y la obligación se queda sin soporte.

### 10 · La hoja CALENDARIO al cambiar de año

El calendario del año nuevo se pega **encima** de CALENDARIO, y ahí es donde se
pierden cosas si no se tiene cuidado: PROGRAMACION **no** se vuelve a cargar,
porque si se recarga se borran los correos que se fueron llenando a mano durante
todo el año.

Lo que sí hay que hacer al cambiar de año: habilitar la vigencia nueva en
VIGENCIAS con los ids de sus carpetas de Drive, con
`habilitarVigencia("2027")`.

### 11 · Nadie debe editar OBLIGACIONES a mano

Se puede, y a veces hace falta para una prueba. Pero cambiar el `estado` a mano
se salta `validarPaso()`, y un estado al que no se llegó por el camino correcto
deja la fila en un sitio del que la aplicación no sabe salir.

Si hay que corregir algo, mejor por la interfaz. Y lo que se toque a mano no
queda en EVENTOS, así que en una auditoría no hay quién responda por ese cambio.

### Lo que NO hay que vigilar, porque está cubierto

- **Correr dos veces la carga mensual.** El id de la obligación sale de sus
  datos, no de un contador: lo que ya existe se salta.
- **Que se corte por tiempo.** Las cargas se reanudan y lo escrito queda bien
  escrito.
- **Dos personas a la vez.** `LockService` serializa las escrituras.
- **Que alguien entre sin permiso.** Cada `api…()` valida en el servidor.
  Esconder el botón no es la defensa.
- **Archivar meses viejos.** `archivarCerradas()` mueve, no borra, y no toca lo
  que sigue abierto.

---

## 9 · Si algo sale mal

| Lo que ves | Qué pasa |
|---|---|
| No aparece el menú **SINAV** | Cierra y abre el Sheets. `onOpen()` solo corre al abrir el libro |
| *"Falta la hoja X. Corre instalar()"* | Eso: menú SINAV → Instalar / verificar |
| `ReferenceError: ESTADO is not defined` (o `HOJA`, `COLS`, `ROL`…) | Tienes los archivos sueltos en vez del paquete. Haz el [paso 2b](#2b--si-tu-proyecto-ya-quedó-hecho-un-lío): borra todo y pega los tres de `dist/` |
| No encuentro la función `instalar` en el desplegable | `Codigo` no está en el proyecto, está vacío o tiene un error de sintaxis. El desplegable solo lista funciones de archivos que cargaron bien |
| Tengo `instalar()` en un archivo que no es `Codigo` | Pegaste los archivos sueltos y alguno quedó con el contenido de otro. Paso 2b |
| *"Tu correo está en la hoja USUARIOS con activo = NO"* | Alguien lo desactivó. Cámbialo a `SI` en USUARIOS |
| *"Tu fila en USUARIOS no tiene un rol que SINAV reconozca"* | El valor de `rol` está mal escrito. Usa el desplegable |
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

## 10 · Desarrollo

```
npm run build     # regenera dist/ a partir de src/
npm test          # corre las pruebas y luego el build
npm run mock      # arma la interfaz para verla en el navegador
```

No hay dependencias que instalar: todo usa node a secas.

### El build

Une `src/*.gs` en `dist/Codigo.gs` y `src/ui/*.html` en `dist/Index.html`,
resolviendo los `include()`. Antes de escribir nada comprueba que el resultado
compile, que no reviente al cargar, que no haya dos funciones con el mismo
nombre (al unir archivos una pisaría a la otra en silencio) y que `instalar`,
`migrar`, `pruebas`, `onOpen` y `doGet` estén ahí.

**Corre `npm run build` y commitea `dist/` cada vez que toques `src/`**, o lo
que se pega en Apps Script queda viejo.

### Las pruebas

178 aserciones sobre las reglas donde un error silencioso se propaga: la
normalización de periodicidad, «sin soporte no hay envío», la normalización de
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

### Si algún día quieren un build de verdad

El camino es **Vite + clasp**: el código de `src/ui` pasa a módulos, Vite arma un
bundle y `clasp push` lo sube. Hoy no, por el plazo: React 18 + htm desde CDN no
necesita compilar nada y se pega directo en el editor.

---

## 11 · Antes de pasar a producción

El aviso de «ambiente de pruebas» **no se quita del código**: desaparece solo
cuando `CONFIG.modo` pasa a `PRODUCCION`. Quitar el cartel dejando el modo en
`PRUEBA` sería lo peor de los dos mundos — los correos seguirían yendo a la
propia bandeja y nadie se enteraría.

Y al revés: en el segundo en que se pasa a `PRODUCCION`, los correos salen a
las alcaldías de verdad y lo enviado no se puede desenviar. Por eso no se edita
la celda a mano:

1. **SINAV → Revisar antes de producción.** No cambia nada. Lista las
   obligaciones que están en `LISTA` con el correo al que irían, y avisa de lo
   que huele a prueba: correos inventados (`oficina.*@davivienda.com`) y
   soportes que no son un PDF de verdad.
2. Arregla lo que señale.
3. **SINAV → PASAR A PRODUCCIÓN.** Vuelve a mostrar la lista y pide
   confirmación. **Se niega** si sigue habiendo datos de prueba en `LISTA`.
4. Recarga la aplicación: el aviso ya no está.

Queda un `AVISO` en EVENTOS con quién lo hizo y cuándo. Y si hay que parar
todo: `volverAPruebas()`.

### Lo que conviene dejar listo antes

- **El logo.** Sube el archivo oficial a Drive y pon su id en **Configuración
  del proyecto → Propiedades del script → `logo_id`**. Es cableado del
  despliegue, no un parámetro del negocio, así que no ocupa una fila de CONFIG
  que los usuarios ven. Se acepta el id o el enlace completo, y la cuenta que
  despliega tiene que poder ver el archivo (los usuarios finales no necesitan
  permiso). Se sigue leyendo `CONFIG.logo_id` como respaldo. Mientras no haya
  id, la interfaz muestra el espacio reservado punteado.
- **Las tres filas de prueba** de `instalar()` y su soporte `.txt` en Drive,
  incluidos los correos `oficina.*@davivienda.com`, que son inventados. Estas
  son justo las que bloquean el paso a producción si están en `LISTA`.
- **Los correos de oficina que falten.** No bloquean: sin correo la obligación
  se queda en `LISTA` esperando, no se envía a nadie equivocado. Se pueden ir
  llenando con la herramienta ya en producción.
- **EXOGENA**, si el libro se cargó antes del cambio: `SINAV · Mes → Arreglar
  EXOGENA`.
- **El activador del día 1**: `SINAV · Mes → ¿Está programada?`
