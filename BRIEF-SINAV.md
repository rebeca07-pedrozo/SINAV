# BRIEF — Sistema de control de obligaciones tributarias territoriales

> Este archivo es la fuente de verdad del proyecto. Léelo completo antes de escribir
> código y vuelve a él cuando dudes. Si algo acá contradice lo que te pida en el chat,
> dímelo en vez de elegir por tu cuenta.

---

## 1. De dónde viene esto y cuál fue el error que corregimos

El proyecto arrancó como un **sistema de alertas de vencimientos tributarios**. Se le
presentó al equipo y lo rechazaron: dijeron que era doble trabajo. Tenían razón, y la
razón importa más que el rechazo.

**El equipo ya notifica.** Cada obligación arranca con un correo que ellos le mandan a la
oficina del municipio, con la declaración adjunta, el sticker del envío interno, el
consecutivo del egreso y la fecha de vencimiento. Ese correo ya existe, ya sale, y su
fecha ya es el hito real del proceso.

El primer diseño ponía una alerta **al lado** de ese correo y pedía que alguien marcara
estados a mano. Por eso era doble trabajo.

**El diseño correcto instrumenta el correo que ya existe.** El sistema manda ese mismo
correo, le guarda el hilo, lee la respuesta que vuelve sobre ese hilo, y de ahí saca el
estado, la fecha de presentación y la evidencia. Nadie digita nada que ya haya escrito.
Las alertas no son el producto: son una consecuencia de tener el dato bien.

Tenlo presente en cada decisión de diseño: **si una función le pide al usuario un dato
que ya está en un correo, está mal pensada.**

### Los hallazgos que justifican el proyecto

Salieron de analizar los archivos reales del equipo. Son el criterio de éxito, no
decoración:

- **2.285 obligaciones** en el universo: 304 municipios × 7 impuestos (Predial 783,
  Industria y Comercio 538, Medios magnéticos 357, Retención ICA 325, Autorreteica 260,
  Alumbrado Público 21, Actualización RIT 1).
- De **1.764 obligaciones de Retención ICA ya vencidas** (enero–agosto 2026):
  - 873 (49,5%) tienen fecha de presentación y valor → evidencia completa
  - 195 (11%) tienen valor pero no fecha → registro incompleto
  - **696 (39,5%) están completamente en blanco** → vencidas sin ningún rastro
- El porcentaje es casi idéntico entre los dos responsables (49% y 51%). **No es un
  problema de personas, es que el registro manual no aguanta el volumen.**
- De 306 correos enviados a oficinas: 215 respondieron (70%), 69 nunca respondieron
  (22,5%), **22 rebotaron (7,2%) sin que nadie se enterara**.

### Las cuatro fallas estructurales del sistema actual

1. **La hoja de envíos es una bitácora, no un registro.** 306 filas para 34 municipios:
   cada reenvío crea una fila nueva. No se puede contar cuántas obligaciones hay.
2. **No existe columna de periodo.** El periodo vive dentro del nombre del PDF adjunto,
   en tres formatos distintos: `SEPTIEMBRE 2026`, `4BIM 2026`, `3 TRIMESTRE 2026`.
3. **El histórico se destruye solo.** Vencimiento, valor y consecutivo son fórmulas
   `IMPORTRANGE`+`VLOOKUP` vivas contra otros libros. Una fila de mayo de 2025 hoy
   muestra el valor de hoy. **No hay evidencia de qué se notificó ni cuándo.**
4. **Los rebotes son invisibles.** Quedan en una columna que nadie mira.

---

## 2. Reglas que no se negocian

Si el código viola una de estas, está mal, aunque funcione.

1. **Nunca fórmulas vivas en el maestro.** Los valores se copian de la fuente al crear la
   fila del periodo y quedan congelados. Si la fuente cambia después, se registra como
   novedad con fecha en el log; **no se sobrescribe**.
2. **Nada se borra.** Las correcciones son filas nuevas en el log de eventos. El log es
   append-only.
3. **Una obligación ≠ un envío.** El reenvío número 21 es un registro en `ENVIOS`, no una
   obligación nueva.
4. **Estado automático donde hay evidencia; manual solo donde hay juicio humano.**
5. **Nunca le pidas al usuario un dato que ya está en un correo o en el calendario.**
6. **No inventes datos.** Si falta un dato en la fuente, la celda queda vacía y la fila
   cae en una bandeja de excepción. Jamás un valor por defecto que parezca real.
7. **Si no sabes algo, déjalo como `TODO` y dímelo.** No resuelvas una pregunta abierta
   inventando una respuesta plausible.

---

## 3. Arquitectura

Dos libros de Google Sheets + un proyecto de Apps Script por libro, compartiendo una
librería común.

### Libro A — OPERACIÓN (reemplaza el envío masivo actual)

| Hoja | Qué es |
|---|---|
| `CONFIG` | **Parámetros editables por el usuario.** Nada de esto vive en el código. |
| `CALENDARIO` | Importado de la fuente externa. Solo lectura. El universo de obligaciones. |
| `OBLIGACIONES` | **El maestro.** Una fila por obligación y periodo. Valores congelados. |
| `ENVIOS` | Una fila por correo enviado. |
| `EVENTOS` | Log append-only e inmutable de cada cambio de estado. |
| `CONTACTOS` | Directorio: código de oficina → correos autorizados. |
| `PLANTILLAS` | Cuerpos de correo con marcadores. |
| `CONCILIAR` | Bandeja de correos recibidos que no se emparejaron solos. |
| `EXCEPCIONES` | Obligaciones que no pudieron procesarse y por qué. |

### Libro B — ALERTAS Y TABLERO

Lee de Libro A a través de la librería. **Nunca guarda su propia copia editable de las
obligaciones.** Si escribe algo, escribe en `EVENTOS`.

### Esquema de `OBLIGACIONES`

```
id                  texto, llave: cod_dane|tipo_obligacion|regimen|periodo
                    (actualizado 2026-10-14: la oficina es consecuencia, no identidad; sin secuencias)
cod_oficina         texto, con ceros a la izquierda ("0851", no 851)
cod_dane            texto
municipio           texto
empresa             texto
nit_municipio       texto, NIT del municipio (no de la empresa; la empresa es siempre la misma)
tipo_obligacion     enum: RETEICA | AUTORRETEICA | ICA | EXOGENA | PREDIAL | ALUMBRADO | RIT
regimen             Comentario del calendario normalizado (mayúsculas, sin tildes), "GENERAL" si viene vacío
regimen_texto       Comentario original, útil para el correo a la oficina
periodo             texto normalizado: "2026-09" | "2026-B4" | "2026-T3" | "2026-C1" | "2026-A"
periodo_por_confirmar  "SI" cuando la regla que derivó el periodo está pendiente de validar
periodicidad        enum: MENSUAL | BIMESTRAL | TRIMESTRAL | CUATRIMESTRAL | SEMESTRAL | ANUAL
vencimiento         fecha, congelada al crear
presentacion_texto  texto crudo de la columna "Presentacion" de la fuente (60+ valores, sin enum)
correo_municipio    correo extraído de presentacion_texto cuando la celda trae uno
forma_pago          enum: OFICINA | OFICINA_RECIBO | MIXTA | PSE | TRANSFERENCIA | OTRO (de la columna "Pago")
requiere_envio_oficina  enum: SI | NO | REVISAR — editable por el equipo; decide si se manda correo
profesional         texto
jefe                texto
consecutivo_egreso  texto
sticker             texto
valor               número, vacío hasta que se confirme
estado              enum (ver §6)
estado_desde        fecha-hora
devuelta_desde      estado anterior, solo si estado = DEVUELTA
motivo_devolucion   texto, obligatorio si estado = DEVUELTA
reprocesos          entero, cuenta cuántas veces se devolvió
adjunto_salida_id   id en Drive del PDF que se adjunta al correo
thread_id           id del hilo de Gmail del envío
fecha_envio         fecha-hora del primer correo — EL HITO DEL PROCESO
evidencia_id        id en Drive del PDF sellado que devolvió la oficina
evidencia_hash      SHA-256 del archivo al archivarlo
```

**Normalización de periodicidad:** la fuente trae `ANUAL`, `Anual`, `MENSUAL`,
`MENSUAL ` (con espacio), `Mensual`, y `ANUAL - Con la última declaración de retención`.
Normaliza en la ingesta del calendario, no en cada consumo.

### Esquema de `EVENTOS` (append-only)

```
timestamp | id_obligacion | estado_anterior | estado_nuevo | origen | actor | detalle | hash_evidencia
```

`origen`: `AUTOMATICO_CORREO` | `AUTOMATICO_CALENDARIO` | `MANUAL_UI` | `MANUAL_BOTON` | `SISTEMA`

---

## 4. Configuración y puesta en marcha — léelo antes de pedir IDs

**No me pidas que cree el libro a mano ni que te pase IDs pegados en el chat.** Escribe un
script de instalación que lo haga todo y deje los IDs guardados.

### Qué construyes

`00_setup.gs` con una función `instalar()` que yo corro **una sola vez** desde el editor
de Apps Script. Esa función:

1. Crea el libro de OPERACIÓN con todas sus hojas y encabezados.
2. Crea la estructura de carpetas en Drive (ver §5 y §7).
3. Crea la hoja `CONFIG` con los parámetros y sus valores por defecto vacíos.
4. Guarda los IDs en `PropertiesService.getScriptProperties()`.
5. Imprime en el log un resumen con todos los IDs y las URLs creadas.
6. Es **idempotente**: si la corro dos veces no duplica nada, verifica y completa lo que
   falte.

Y una función `verificarInstalacion()` que valida que todo exista y esté bien
configurado, y me dice exactamente qué falta.

### La hoja CONFIG — lo que yo edito, sin tocar código

Dos columnas: `parámetro` | `valor`. El código lee de acá, nunca tiene constantes
quemadas. Parámetros mínimos:

```
alias_envio               impuestosdavivienda@davivienda.com  (ver §4.3)
nombre_remitente          lo que ven las oficinas como remitente
correo_administrador      a dónde llegan las alertas de excepción
etiqueta_respuestas       etiqueta de Gmail donde caen las respuestas de las oficinas
carpeta_salida_id         Drive: declaraciones por enviar
carpeta_evidencia_id      Drive: soportes sellados recibidos
calendario_libro_id       libro externo del calendario tributario
calendario_hoja           nombre de la hoja dentro de ese libro
etiqueta_gmail            etiqueta que el sistema le pone a lo que procesa
dias_alerta               10,4,2,0
tipos_activos             RETEICA           (en marcha blanca, solo este)
modo                      OBSERVACION | PRUEBA | PRODUCCION
tope_correos_dia          1500
```

**`modo` es importante:** en `OBSERVACION` el sistema no manda ni un correo. En `PRUEBA`
manda todo al `correo_administrador` en vez de a las oficinas. En `PRODUCCION` manda de
verdad. El valor por defecto al instalar es `OBSERVACION`. Nunca lo cambies tú.

### 4.3 Despliegue y envío — leer completo, es la decisión que más se malinterpreta

**El proyecto se despliega bajo mi cuenta personal**, igual que el sistema de Marcaciones
y Reintegros que ya lleva meses en producción. Yo soy dueña del libro, del script y de
las carpetas de Drive.

**Pero los correos NO salen con mi nombre.** Salen con el alias
`impuestosdavivienda@davivienda.com`, que está configurado en mi Gmail como *"Enviar
como"*. Ese es exactamente el patrón de Marcaciones y funciona.

En código:

```javascript
GmailApp.sendEmail(destinatarios, asunto, cuerpo, {
  from: config('alias_envio'),
  name: config('nombre_remitente'),
  replyTo: config('alias_envio'),
  attachments: [adjunto],
  htmlBody: cuerpoHtml
});
```

**`verificarInstalacion()` tiene que comprobar que el alias existe** antes de permitir
cualquier envío:

```javascript
if (GmailApp.getAliases().indexOf(aliasEnvio) === -1) { ... }
```

Si el alias no está configurado, el sistema **no envía** y me avisa qué falta. No cae de
vuelta a mandar con mi dirección: un correo que sale con mi nombre personal a 88 oficinas
es un problema, no un error menor.

### Dónde caen las respuestas — esto decide si la ingesta funciona

El script corre bajo mi cuenta, así que **`GmailApp` solo puede leer mi buzón**. Para que
el emparejamiento automático funcione, las respuestas de las oficinas tienen que llegar
ahí.

Como `replyTo` apunta al alias, el comportamiento depende de cómo esté montado
`impuestosdavivienda@`:

- **Alias "enviar como" sobre mi propia cuenta** → las respuestas caen en mi bandeja.
  Funciona directo.
- **Grupo de Google del que soy miembro** → me llega copia. Funciona.
- **Buzón aparte sin reenvío hacia mí** → **no funciona**: el script no puede leerlo.
  Habría que configurar reenvío automático hacia mi cuenta.

**`TODO` para mí, no para ti:** confirmar cuál de los tres casos es. Mientras tanto,
construye asumiendo que las respuestas llegan a mi buzón, y crea un filtro de Gmail que
les ponga `etiqueta_respuestas`. El observador de la Fase 0 va a confirmarlo con datos
reales en la primera semana.

De todos modos el emparejamiento es por `threadId`, no por dirección — así que mientras
el correo llegue al buzón que el script lee, funciona.

### Continuidad — el riesgo que aceptamos a conciencia

Correr bajo mi cuenta significa que si yo salgo o roto, hay que migrar el script. Es el
mismo riesgo que ya aceptamos en Marcaciones y lo asumimos otra vez.

**Lo que sí es obligatorio:** que migrar sea cambiar celdas en `CONFIG` y volver a
autorizar, nunca editar código. Por eso no hay un solo correo, id ni carpeta quemados en
los `.gs`. Si algún día pasamos a cuenta funcional, el cambio debe ser de minutos.

---

## 5. Drive de salida — el PDF que se adjunta al correo

Esto es la mitad del proceso y es fácil pasarlo por alto.

Antes de enviar, alguien del equipo ya produjo el PDF de la declaración. Hoy ese archivo
vive en Drive y el link se pega a mano en una columna de la hoja. **Eso se acaba: el
sistema lo busca solo, por convención de nombre.**

### Estructura

```
/Declaraciones por enviar/{año}/{periodo}/
```

### Convención de nombre

```
{cod_oficina}-{MUNICIPIO} {PERIODO}.pdf
```

Ejemplos reales de hoy: `0851-AGUADAS SEPTIEMBRE 2026.pdf`,
`1373-MONTENEGRO 4BIM 2026.pdf`, `0480-SOCORRO 3 TRIMESTRE 2026.pdf`

**Una obligación puede tener dos archivos.** Cuando hay exógena, el nombre lleva la
palabra `EXÓGENA` (con tilde) o `EXOGENA` (sin tilde — las dos formas aparecen en los
datos reales):

```
0483-EXÓGENA PIEDECUESTA JUNIO 2026.pdf
0483-PIEDECUESTA JUNIO 2026.pdf
```

El buscador tiene que tolerar: tildes o su ausencia, espacios de más, mayúsculas y
minúsculas, y el código con o sin ceros a la izquierda. Normaliza los dos lados antes de
comparar — no uses igualdad exacta de strings.

### La regla que cierra un hueco grave

Hoy el complemento de mail merge avisa *"86 rows don't have an attachment"* y **deja
enviar igual**. Es decir, hoy pueden salir 86 correos sin la declaración adjunta.

**En este sistema: si no se encuentra el archivo, la obligación NO se envía.** Queda en
`EXCEPCIONES` con motivo `SIN_ADJUNTO` y entra en la alerta diaria del administrador.
Esto no es configurable y no tiene bandera para saltárselo.

---

## 6. Máquina de estados

```
PENDIENTE → NOTIFICADA → EN_TRAMITE_OFICINA → PRESENTADA → EN_REVISION → APROBADA
                                                               ↓
                                                           DEVUELTA
                                                               ↓
                                              vuelve a EN_TRAMITE_OFICINA
```

Más dos estados laterales:

- `SIN_EVIDENCIA` — automático. Pasó el vencimiento sin confirmación. Hoy son el 39%.
  **Es un estado legítimo y accionable, no un vacío.**
- `REBOTADO` — automático. El correo no llegó.

### Reglas

- `PENDIENTE`, `NOTIFICADA`, `EN_TRAMITE_OFICINA`, `PRESENTADA`, `SIN_EVIDENCIA` y
  `REBOTADO` son **automáticos**.
- `EN_REVISION`, `APROBADA` y `DEVUELTA` son **manuales**.
- `NOTIFICADA` se dispara con el envío del correo y graba `fecha_envio`. Ese es el hito
  del proceso: de ahí se cuenta el tiempo de reacción de la oficina.
- Al devolver: se guarda `devuelta_desde`, `motivo_devolucion` (obligatorio) y se
  incrementa `reprocesos`. **El vencimiento NO se reinicia.**
- El estado lo determina **el último evento clasificado del hilo**, no el primero. Un
  mismo hilo puede traer respuesta de la oficina y después observación de revisoría.

### Clasificación de respuestas entrantes

Un correo que llega al hilo se clasifica por remitente y contenido en: `OFICINA`,
`REVISORIA`, `EQUIPO_INTERNO`, `REBOTE`, `OTRO`.

**No tenemos todavía muestras reales de cómo responde revisoría.** Por eso la Fase 0.
No inventes las reglas de clasificación: constrúyelas sobre lo que el observador recoja.

---

## 7. Drive de entrada — la evidencia que exige riesgos

El área de riesgos audita que el control exista y funcione. Esto es tan importante como
el envío.

1. **El archivo vive en una carpeta controlada**, no en el correo de una persona:
   `/Evidencia/{año}/{periodo}/{tipo_obligacion}/`
   Escritura solo para la cuenta funcional, lectura para el equipo.

2. **Nombre canónico**, no el que mandó la oficina:
   `{cod_oficina}-{MUNICIPIO}-{tipo}-{periodo}-{clase}.pdf`
   `clase` ∈ `sello` | `pago` | `soporte`

3. **Se guarda más que el PDF:** la declaración sellada, el soporte de pago, la fecha y
   hora de *llegada* (no la del documento), el remitente, y el `messageId` del correo
   — que es el respaldo independiente de que eso llegó así y de quién.

4. **Integridad.** Al archivar, calcula el SHA-256 con
   `Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)` y guárdalo en
   `OBLIGACIONES.evidencia_hash` y en el evento. Un verificador periódico recalcula los
   hashes y alerta si alguno no cuadra. **Esta es la diferencia entre "guardamos el
   soporte" y "podemos demostrar que no se tocó".**

5. **Retención:** `TODO` — pendiente de definir. No asumas un número de años.

6. **`TODO` abierto:** está por confirmar si riesgos exige que la evidencia viva en el
   gestor documental corporativo en vez de Drive. **Deja la capa de almacenamiento detrás
   de una interfaz** (`guardarEvidencia`, `leerEvidencia`, `verificarEvidencia`) para
   poder cambiar el destino sin tocar el resto.

---

## 8. Motor de envío

- Lee las obligaciones del periodo con `requiere_envio_oficina = SI`.
  **Las de `NO` no se envían a nadie** — no hay oficina involucrada; esas solo generan alerta
  al profesional. Las de `REVISAR` van a `EXCEPCIONES` y no se envía nada hasta que el equipo
  las defina. Siembra: Pago = OFICINA u OFICINA - RECIBO → SI; PSE o TRANSFERENCIA → NO;
  MIXTA, vacío u otro → REVISAR. (Actualizado 2026-10-14: el enum `canal_presentacion` no
  correspondía a los datos reales.)
- Busca el adjunto en Drive (§5). Sin adjunto no hay envío.
- Arma el cuerpo desde `PLANTILLAS` reemplazando marcadores.
- Envía con `GmailApp.sendEmail` usando `from` y `replyTo` con el alias de `CONFIG`
  (§4.3), y **guarda el `threadId` inmediatamente** en la fila. Ese id es la pieza
  central de todo el diseño: sin él no hay emparejamiento automático.
- Antes del primer envío de cada corrida, valida que el alias siga en
  `GmailApp.getAliases()`. Si no está, aborta la corrida completa y avisa.
- El cuerpo pide explícitamente: *responder sobre este mismo correo, no abrir uno nuevo*.
- Registra el envío en `ENVIOS` con `intento_n` y pone `fecha_envio` si es el primero.
- Respeta `modo` de `CONFIG` y el contador de `tope_correos_dia`.
- Un rebote marca la obligación como `REBOTADO` y **escala como si estuviera vencida**.

---

## 9. Tablero — en Apps Script, no en Looker

Lo quiero dentro del mismo ecosistema, no en una herramienta aparte.

- `80_kpis.gs` calcula los indicadores y **cachea el resultado** con `CacheService`
  (10 minutos) más un respaldo en `PropertiesService`. Nunca recalcules sobre 2.285 filas
  en cada carga de la página.
- `81_tablero.html` servido con `HtmlService.createTemplateFromFile`, desplegado como
  aplicación web con acceso restringido al dominio.
- `doGet()` sirve el tablero; `google.script.run` trae los datos.
- También accesible desde el menú de la hoja como barra lateral.

### Indicadores

Los mismos del análisis, para que sean comparables:

- % con evidencia completa (hoy 49,5%)
- Obligaciones vencidas sin ningún rastro (hoy 696)
- Vencen en 4 días o menos
- % de correos que rebotaron (hoy 7,2%)
- Distribución de estados del periodo
- Cumplimiento por responsable
- Tabla de las próximas 48 horas
- Tiempo promedio entre `fecha_envio` y presentación — **este indicador no existe hoy y
  es el que justifica instrumentar el correo**

### Cómo graficar

Si tienes disponible la skill **`dataviz`**, úsala y síguela. Si no, estas son las reglas
mínimas que no se negocian:

- Nada de librerías de gráficos pesadas. HTML, CSS y SVG propios. El tablero debe cargar
  rápido dentro de Apps Script.
- Un solo eje por gráfico. Nunca dos escalas en el mismo.
- Cada segmento o serie lleva **etiqueta directa con su nombre y su número**. La identidad
  nunca se transmite solo por color.
- Separación de 2px entre segmentos de una barra apilada.
- Los colores de estado (bien / advertencia / crítico) son reservados y no se reutilizan
  para "serie 4".
- Grid y ejes discretos; las marcas delgadas.
- El texto va en color de texto, nunca en el color de la serie.
- Paleta de estado sugerida, ya validada por contraste:
  `#1F7A4D` bien · `#2563A8` información · `#B06C00` advertencia · `#C2362B` crítico ·
  `#7A756B` neutro

---

## 10. Alertas

El equipo recibe hasta 50 correos al día. Si las alertas se pierden en ese ruido, el
sistema no sirve. Por eso:

- **Un solo correo diario por persona**, no uno por obligación.
- El número crítico va al frente del asunto: `3 vencen en 4 días · 2 sin evidencia`.
- Remitente propio y filtrable.
- Escalamiento: **T-10** informativa · **T-4 obligatoria** (requisito explícito del área)
  · **T-2 con copia al jefe** · **T-0 y vencidas**, diario a jefatura.
- Alertas de excepción al administrador: rebotes, obligaciones sin adjunto, correos sin
  emparejar, obligaciones sin responsable, hashes que no cuadran.

---

## 11. Restricciones técnicas de Apps Script

Tenlas presentes al diseñar, no las descubras a mitad de camino:

- **Tiempo de ejecución:** 6 minutos por ejecución (verificar si el tenant Workspace da
  más). Todo proceso masivo va por lotes con cursor en `PropertiesService` y se
  reprograma solo.
- **Cuota de correo:** 1.500 destinatarios/día en Workspace. **La cuota es de la cuenta
  que despliega (la mía), no del alias** — usar un alias no da cupo extra. Envíos,
  alertas y reintentos comparten el mismo cupo, y mi correo de trabajo normal también
  cuenta. Lleva un contador en `PropertiesService` y frena antes de toparte.
- **Triggers:** máximo 20 por script por usuario.
- **Concurrencia:** usa `LockService` en todo lo que escriba en las hojas. Dos triggers
  solapados corrompen el maestro.
- **Rendimiento:** nunca leas o escribas celda por celda. `getValues()` / `setValues()`
  en bloque, siempre.
- **Gmail:** `GmailApp.search()` con query acotada y etiqueta propia. No recorras toda la
  bandeja.
- **Fechas:** zona horaria `America/Bogota` declarada en `appsscript.json`. Nunca
  construyas fechas con strings sin zona.
- **Drive:** `DriveApp.getFolderById().getFilesByName()` es exacto y no tolera variantes.
  Para buscar con tolerancia usa `searchFiles` con query, y normaliza del lado del código.

---

## 12. Qué construir, en qué orden

**Construye Setup + Fase 0 y para. Muéstrame antes de seguir.**

### Setup

`00_setup.gs` completo y probado (§4). Sin esto no se puede hacer nada más.

### Fase 0 — Observador

Un script de **solo lectura** que corre cada 5 minutos sobre el buzón y escribe en una
hoja `MUESTRAS`: `threadId`, `messageId`, remitente, asunto, fecha, si es respuesta a un
envío nuestro, si trae adjunto y de qué tipo, y el cuerpo en texto plano.

No modifica nada. No manda correos. Solo observa.

Sirve para dos cosas: medir qué porcentaje responde sobre el hilo original y recoger
muestras reales de cómo responde revisoría, que es lo que falta para diseñar el
clasificador.

### Fase 1 — El maestro como espejo

- Importar y normalizar `CALENDARIO`.
- Generador de periodos: crea las filas de `OBLIGACIONES` desde el calendario y la
  periodicidad.
- Resolver el adjunto de salida en Drive y marcar las que no tienen.
- Marcar estados leyendo lo que ya existe, sin pedirle nada a nadie.
- Calcular el indicador de "sin evidencia".

Al final de esta fase el sistema **mide el 39% sin que nadie haya cambiado su forma de
trabajar**. Ese es el entregable que cambia la conversación con riesgos.

### Fases siguientes (NO las construyas todavía)

- **Fase 2:** motor de envío + motor de ingesta + bandeja de conciliación + evidencia con
  hash. Acá desaparece el doble trabajo.
- **Fase 3:** alertas y tablero.
- **Marcha blanca** sobre Fase 2, en un ciclo mensual (menos volumen que el bimestral),
  corriendo en paralelo con el proceso actual y comparando fila a fila.

---

## 13. Estructura del repositorio

```
/src
  00_config.gs        lectura de la hoja CONFIG y de ScriptProperties
  00_setup.gs         instalar() y verificarInstalacion()
  01_esquema.gs       nombres de columnas, lectura/escritura tipada
  02_utiles.gs        fechas, periodos, normalización de texto, lotes, lock
  10_calendario.gs    importar y normalizar el calendario
  20_generador.gs     crear filas de periodo
  25_adjuntos.gs      buscar el PDF de salida en Drive
  30_envio.gs         motor de envío            (Fase 2)
  40_ingesta.gs       lectura y clasificación   (Fase 2)
  50_estados.gs       máquina de estados
  60_evidencia.gs     Drive, nombres, hash
  70_alertas.gs       escalamiento y digest     (Fase 3)
  80_kpis.gs          cálculo y caché de indicadores
  81_tablero.html     el tablero                (Fase 3)
  90_observador.gs    Fase 0
  99_menu.gs          menú en la hoja
/tests
  *.test.gs           pruebas con datos de ejemplo
/docs
  BRIEF-SINAV.md      este archivo
  decisiones.md       bitácora de decisiones de diseño
  instalacion.md      pasos para poner esto a andar desde cero
appsscript.json
.clasp.json
README.md
```

Usa **clasp** para versionar. `.clasp.json` va en `.gitignore` (lleva el id del script).

---

## 14. Convenciones de código

- **Español** para nombres de funciones, variables y comentarios. El equipo que va a
  mantener esto trabaja en español.
- **Nombres simples y directos.** `fechaVence`, no `fechaDeVencimientoDeLaObligacion`.
  `filas`, no `arrayDeRegistrosProcesados`.
- Funciones cortas, una responsabilidad cada una.
- Toda función que escriba en una hoja pasa por la capa de `01_esquema.gs`. Nadie escribe
  en un rango directamente desde la lógica de negocio.
- **Cero constantes quemadas.** Correos, ids y carpetas salen de `CONFIG`.
- Comentarios solo donde el *por qué* no es obvio. El *qué* se lee en el código.
- Errores: nunca silenciarlos. Log estructurado + alerta de excepción al administrador.

---

## 15. Cómo quiero que trabajes

1. **Lee este archivo completo antes de escribir nada.**
2. Propón la estructura de archivos y el esquema de las hojas, y **espera mi visto bueno**
   antes de implementar.
3. Construye Setup + Fase 0, muéstrame, y para.
4. Después Fase 1, muéstrame, y para.
5. Cada vez que te topes con una decisión que este archivo no resuelve: **pregúntame**.
   No la resuelvas sola aunque tengas una opción razonable.
6. Escribe pruebas con datos de ejemplo para el generador de periodos, la normalización de
   periodicidad y la búsqueda de adjuntos con tildes y variantes. Son las tres piezas
   donde un error silencioso se propaga a todo.
7. Anota en `docs/decisiones.md` cada decisión de diseño que tomemos, con la fecha y el
   porqué.
8. Escribe `docs/instalacion.md` a medida que construyas el setup, no al final.

---

## 16. Preguntas abiertas — NO las resuelvas inventando

| # | Pregunta | De quién depende |
|---|---|---|
| 1 | ¿"Revisoría" es revisoría fiscal (firma la declaración) o la revisión interna del líder? Define si es parada real del flujo o campo informativo. | Jefatura |
| 2 | ¿La evidencia puede vivir en Drive o riesgos exige el gestor documental corporativo? | Riesgos |
| 3 | ¿Cuántos años hay que conservar la evidencia? | Jefatura / Riesgos |
| 4 | ¿`impuestosdavivienda@` está montado como alias "enviar como" sobre mi cuenta, como grupo, o como buzón aparte? **De esto depende si la ingesta automática funciona** (§4.3). La Fase 0 lo confirma con datos reales. | Yo / Tecnología |
| 5 | ¿Cuál es el límite real de envío diario del tenant, y cuánto de ese cupo consume mi correo normal? | Tecnología |
| 6 | ¿Quién produce hoy el PDF que se adjunta, y seguirá produciéndose igual? Hoy sale de un complemento de generación de documentos. | Equipo |
| 7 | ¿El motor de envío reemplaza el mail merge de una o conviven un ciclo? **La decisión más difícil de revertir del proyecto.** | Jefatura |
| 8 | ¿Arrancamos solo con Retención ICA o con los 7 impuestos? (recomendación: solo ReteICA, con el modelo ya preparado para los 7) | Jefatura |

Mientras no haya respuesta, deja un `TODO` visible en el código y sigue con lo que no
dependa de eso.
