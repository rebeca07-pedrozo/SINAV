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
