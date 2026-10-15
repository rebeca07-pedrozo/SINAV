# Bitácora de decisiones

## 2026-10-14 — Setup + Fase 0
- **Alcance:** solo Setup y Fase 0, como pide BRIEF §12. Nada de Fase 1 en adelante.
- **Fuente de verdad en CONFIG:** los IDs de carpetas se guardan en `CONFIG` y en
  ScriptProperties, pero el código lee de `CONFIG`, para que migrar sea editar celdas.
- **Observador de solo lectura:** deduplica por `message_id` leyendo `MUESTRAS`, en vez de
  etiquetar mensajes (etiquetar sería escribir en el buzón).
- **"Es respuesta a envío nuestro":** hay un mensaje anterior en el hilo enviado desde
  `alias_envio` y el actual viene de otro remitente. Es heurística de Fase 0, no clasificador.
- **CALENDARIO sin encabezados** hasta la Fase 1: no conozco las columnas de la fuente (regla 7).
- **Filtro de Gmail manual:** crearlo por código exige un servicio avanzado y un scope extra.

## 2026-10-14 — Calendario y generador
- **Mapeo de columnas del calendario por posición** (`COLUMNAS_MES`): el encabezado de la fuente es el
  mes del VENCIMIENTO, no del periodo. La hoja "Retención ICA" usa la convención contraria.
- **Bimestral:** se mapea el mes de la fecha; solo si es un mes par se resta 7 días. Restar siempre
  daba periodos equivocados en silencio (Jericó 04/03 caía en febrero). Verificado contra el Excel real.
- **Trimestral / cuatrimestral:** formato `2026-T1` / `2026-C1`. Febrero → B6 del año anterior
  (Yopal, Villavicencio) queda `periodo_por_confirmar`.
- **Llave de obligación** `cod_dane|tipo|regimen|periodo`. 0 choques en 2.900 llaves de ReteICA.
  Descartado: cod_oficina en la llave (es consecuencia), NIT (es del municipio) y números de secuencia
  (no son estables). Riesgo conocido: `regimen` sale de un texto libre; si el Comentario cambia, el
  generador lo detecta por mismo vencimiento (`REGIMEN_CAMBIO_POSIBLE`) y no crea una fila nueva.
- **Canal de presentación:** se reemplaza el enum por `presentacion_texto`, `forma_pago` y
  `requiere_envio_oficina` (SI/NO/REVISAR, editable). Los datos reales no cuadraban con el enum.
- **Texto forzado** en `periodo`, `cod_dane`, `cod_oficina`, `nit`: Sheets convertía "2026-09" en fecha.

## 2026-10-15 — Fase 2: remitente híbrido mientras no haya alias

- **Contexto:** Tecnología no ha habilitado `impuestosdavivienda@` y puede que no lo haga. La usuaria propuso `noReply: true` (patrón de Marcaciones y Reintegros).
- **Decisión (usuaria):** híbrido por tipo de correo. `noReply: true` solo para avisos que no esperan respuesta (alertas internas, confirmaciones). Los correos a oficinas **no** usan noReply: necesitan que la respuesta vuelva por el mismo hilo (`threadId`), que es la base de la ingesta y la evidencia (brief §1, §6, §8).
- **Decisión (usuaria):** los correos a oficinas salen de la cuenta de **quien hace clic** en el botón (p. ej. Jesús), con `name: "Impuestos Davivienda"` y `replyTo` a esa misma cuenta. Queda en su bandeja de Enviados y las respuestas le llegan a él. Esto relaja la regla del brief §4.3 ("no enviar con la cuenta personal"): el equipo que opera es distinto de quien desarrolla, y mientras no haya alias es la única vía que conserva la ingesta por hilo.
- **Consecuencias:** (1) la ingesta debe correr en la cuenta de cada persona que envía (el script solo lee el buzón de quien lo ejecuta); (2) el script debe vincularse al libro OPERACIÓN para tener menú/botón, y cada operador necesita permiso de edición y autorizar una vez; (3) el cupo diario es por persona; (4) `ENVIOS` gana la columna `enviado_por`. Columnas de `ENVIOS` confirmadas.
- **Script vinculado al libro (opción A):** el código se pega en un proyecto nuevo creado desde Extensiones → Apps Script del libro OPERACIÓN, para que `onOpen` muestre el menú. Como las propiedades del script empiezan vacías, `instalar()` ahora adopta el libro vinculado (en vez de crear uno) y deduce la carpeta raíz del padre de `carpeta_salida_id` en CONFIG. Sin esto habría creado libro y carpeta duplicados. El observador del proyecto viejo debe desactivarse para no duplicar filas en MUESTRAS.
- **Si luego hay alias:** se cambia el modo de remitente en CONFIG, sin tocar código.
- **Nota técnica:** `noReply` solo funciona en cuentas Workspace.

## 2026-10-14 — Adjunto de salida: nombre sugerido y buscador tolerante

- **Decisión (usuaria):** el equipo nombra los PDF como quiera; el sistema no puede exigir un formato. Se define uno **sugerido** y el sistema lo publica en `OBLIGACIONES.nombre_adjunto_esperado`: `{cod_dane 5 dígitos}_{TIPO}_{REGIMEN}_{PERIODO}_{MUNICIPIO}.pdf`. Reemplaza para esta etapa la convención `{cod_oficina}-{MUNICIPIO} {PERIODO}.pdf` del brief §5 (la identidad es cod_dane, no cod_oficina).
- **Buscador (`src/25_adjuntos.gs`):** lee el nombre como bolsa de palabras (sin tildes, mayúsculas, ceros, orden ni separadores). Exige DANE + periodo; el tipo si hay más de un tipo activo o el nombre nombra otro tipo (EXÓGENA, AUTORRETEICA); el régimen solo desempata. Busca también en subcarpetas.
- **Por qué:** ante la duda no adivina. Archivo que cuadra con dos obligaciones, u obligación con dos archivos → EXCEPCIONES `ADJUNTO_AMBIGUO`. Mandar la declaración equivocada a un municipio es peor que no mandar.
- **SIN_ADJUNTO:** solo para `requiere_envio_oficina = SI`, estado PENDIENTE, que vencen en ≤ `dias_aviso_sin_adjunto` (CONFIG, por defecto 10) y sin PDF. Evita inundar EXCEPCIONES con obligaciones lejanas. Se cierran solas cuando aparece el PDF. Sin bandera para saltárselo (brief §5).
