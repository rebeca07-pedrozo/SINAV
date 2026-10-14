# Instalación desde cero

1. Instala clasp (`npm i -g @google/clasp`) y entra con tu cuenta personal: `clasp login`.
2. En esta carpeta: `clasp create --type standalone --title "SINAV"` y luego `clasp push`.
   (`.clasp.json` queda fuera de git.)
3. Abre el proyecto en el editor de Apps Script y corre **`instalar()`** una sola vez
   (acepta los permisos de Drive, Gmail y Hojas). Es idempotente.
4. Lee el log: trae las URLs del libro y de las carpetas.
5. En la hoja `CONFIG` del libro nuevo completa: `nombre_remitente`, `correo_administrador`,
   `etiqueta_respuestas` y confirma `alias_envio`. **`modo` se queda en `OBSERVACION`.**
6. Corre **`verificarInstalacion()`**; te dice exactamente qué falta, incluido si el alias
   está en "Enviar como".
7. Crea el filtro de Gmail a mano (Gmail → Configuración → Filtros): los correos que
   respondan a `alias_envio` reciben la etiqueta `etiqueta_respuestas`.
   <!-- TODO(USUARIO): este paso es manual; el script no lo crea. -->
8. Corre **`activarObservador()`** para empezar a recoger muestras en la hoja `MUESTRAS`.

## Migrar a otra cuenta
Cambiar celdas en `CONFIG` y volver a autorizar. No se edita código.
