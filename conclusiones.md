# Conclusiones y observaciones

## Qué se construyó
- Solo **Setup + Fase 0**, como exige `BRIEF-SINAV.md` §12 («construye y para»).
- El `README.md` solo trae el título; la especificación real está en `BRIEF-SINAV.md`.
- Archivos: `src/00_config.gs`, `00_setup.gs`, `01_esquema.gs`, `02_utiles.gs`,
  `90_observador.gs`, `99_menu.gs`, `appsscript.json`, `.gitignore`,
  `docs/instalacion.md`, `docs/decisiones.md`.
- **Nada se ejecutó ni probó**: no hay Apps Script en este entorno. Toca correr
  `instalar()` y `verificarInstalacion()` y revisar el log.

## Lo que te toca a ti (marcado como `TODO(USUARIO)` en el código)
1. **Menú vs. script independiente** (`99_menu.gs`): `onOpen` solo funciona con un script
   vinculado al libro. `instalar()` crea el libro desde un script independiente. Hay que decidir.
2. **Completar `CONFIG`** tras instalar: `nombre_remitente`, `correo_administrador`,
   `etiqueta_respuestas`; confirmar `alias_envio` (lo precargué con el valor del brief).
3. **Filtro de Gmail** de `etiqueta_respuestas`: lo crea una persona (ver `docs/instalacion.md`).
   El brief pedía crearlo; no lo hice por el servicio avanzado y el scope extra que exige.
4. **Columnas de `ENVIOS`, `CONTACTOS`, `PLANTILLAS`, `CONCILIAR`, `EXCEPCIONES`**: el brief
   no las define; son propuestas mías en `01_esquema.gs`. Confírmalas antes de la Fase 2.
5. **`CALENDARIO`** queda sin encabezados porque no conozco la fuente externa (Fase 1).
6. **Ventana del observador** (`newer_than:2d`): la elegí yo; ajústala si hace falta.

## Preguntas abiertas del brief que siguen abiertas (§16)
Revisoría (#1), gestor documental (#2), retención (#3), tipo de alias (#4: la Fase 0 lo
confirmará con datos), cupo del tenant (#5), quién produce el PDF (#6), convivencia con el
mail merge (#7), alcance ReteICA vs. 7 impuestos (#8). No resolví ninguna.

## Observaciones
- **Privacidad:** `MUESTRAS` guarda el cuerpo completo de correos. Conviene restringir el
  acceso al libro mientras dure la Fase 0.
- **Modo:** `modo` queda en `OBSERVACION` y el instalador nunca lo cambia.
- **Alias:** `aliasDisponible()` ya existe para que el motor de envío (Fase 2) se niegue a
  enviar si el alias no está; no hay caída a tu cuenta personal.
- **Falta (por el alcance):** pruebas del generador de periodos, normalización de
  periodicidad y búsqueda de adjuntos (§15.6). Se escriben con la Fase 1.
- **Siguiente paso:** muéstrame el resultado de `instalar()`; con tu visto bueno sigo con la Fase 1.
