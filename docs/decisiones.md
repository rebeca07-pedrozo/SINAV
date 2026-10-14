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
