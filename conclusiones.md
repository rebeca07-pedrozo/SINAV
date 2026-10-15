# Conclusiones y observaciones

Última actualización: 2026-10-14, al cerrar la Fase 1. Para el detalle de cada decisión y su porqué, ver `docs/decisiones.md`. La especificación sigue siendo `BRIEF-SINAV.md`.

## Cómo retomar mañana (Fase 2)

La conversación con Claude **no es la memoria del proyecto**: lo que importa está en el repositorio. Si cierras Visual Studio, el código, `BRIEF-SINAV.md`, `docs/decisiones.md` y este archivo siguen ahí. Puede que el historial de la conversación también se pueda reabrir desde el panel de Claude Code, pero no cuentes con eso.

Para empezar una sesión nueva, abre la carpeta `SINAV` en Visual Studio y dile a Claude algo así:

> Lee `BRIEF-SINAV.md`, `conclusiones.md` y `docs/decisiones.md`. Terminamos la Fase 1. Quiero empezar la Fase 2 (motor de envío), un paso a la vez.

Con eso Claude recupera el contexto. Lo que **no** queda en archivos, y por eso hay que decírselo si importa:

- Que prefieres pasos breves, uno a uno, con el nombre exacto de la función y del archivo que debes ejecutar.
- Que los archivos de Apps Script los creas tú a mano pegando el contenido de `src/` y `tests/` (nada se sube solo; si no tienes `clasp`, el editor de Apps Script solo tiene lo que pegues).

Antes de arrancar, confirma que lo último que pegaste en Apps Script coincide con el repo (último commit: `f7b30b1`).

## Qué está hecho

**Setup + Fase 0:** `instalar()`, `verificarInstalacion()`, el observador de buzón (`90_observador.gs`, escribe en `MUESTRAS`) y las hojas con su esquema.

**Fase 1 completa y validada con datos reales:**

| Pieza | Archivo | Resultado |
|---|---|---|
| Importar y normalizar el calendario | `10_calendario.gs` | 7.890 vencimientos; periodo derivado por periodicidad |
| Generar obligaciones | `20_generador.gs` | 2.900 de ReteICA, llave `cod_dane\|tipo\|regimen\|periodo`, 0 choques |
| Estados desde el histórico | `50_estados.gs` | 888 PRESENTADA, 1.205 SIN_EVIDENCIA, cada cambio en EVENTOS |
| Indicador de "sin evidencia" | `80_kpis.gs` | ver abajo |
| Adjunto de salida en Drive | `25_adjuntos.gs` | buscador tolerante, probado con 3 PDFs reales |

**El entregable de la fase:** el sistema reproduce tu análisis manual sin que nadie haya cambiado su forma de trabajar. Sobre feb–sep 2026, régimen GENERAL:

| | Tu análisis | SINAV |
|---|---|---|
| Completa (fecha y valor) | 49,5% | 49,6% |
| Incompleta | 10,8% | 11,8% |
| Sin rastro | 39,5% | 38,6% |

Con todas las vencidas de ReteICA (2.058): 41,2% completa, 9,3% incompleta, 49,5% sin rastro. Esa cifra más alta incluye otros regímenes y fechas que tu análisis no cubría.

Las pruebas (`pruebasCalendario`, `pruebasGenerador`, `pruebasEstados`, `pruebasAdjuntos`) pasaron.

## Decisiones de diseño que conviene recordar

- **Identidad de una obligación:** `cod_dane|tipo|regimen|periodo`. El NIT es del municipio y la oficina es consecuencia, no identidad. Nunca se fusionan filas.
- **Valores congelados:** una fila ya creada no se sobrescribe. `modo` queda en OBSERVACION y el código nunca lo cambia.
- **Canal de presentación:** `presentacion_texto` crudo, `correo_municipio` extraído, `forma_pago` como enum y `requiere_envio_oficina` (SI/NO/REVISAR, editable por el equipo).
- **Periodos:** BIMESTRAL de meses pares resta 7 días y mapea de nuevo; febrero va a B6 del año anterior marcado `periodo_por_confirmar`. Desviación consciente de la regla "restar 7 días siempre", que rompía varios municipios.
- **Adjuntos:** el equipo nombra como quiera. Nombre sugerido en `nombre_adjunto_esperado` (`05001_RETEICA_GENERAL_2026-09_MEDELLIN.pdf`). El buscador exige código DANE + periodo; ante la duda no adivina (EXCEPCIONES). `adjunto_salida_id` guarda el **link**; el código saca el id con `idDriveDe()`. SIN_ADJUNTO solo avisa cuando vence en ≤ `dias_aviso_sin_adjunto` días (CONFIG, por defecto 10). Sin PDF no se envía, sin bandera para saltarse la regla.

## ¿Ya no hay que preguntarle nada a ese equipo? Sí hay, pero casi nada bloquea el desarrollo

La Fase 2 se puede **construir y probar** sin esas respuestas, siempre en modo OBSERVACION o PRUEBA, enviando solo a tu correo. Lo que no se puede es **pasar a PRODUCCIÓN** sin cerrar lo de la sección "Bloquea producción".

### Bloquea producción de la Fase 2
| Qué | A quién | Por qué importa |
|---|---|---|
| **Alias de envío real** (hoy `impuestosdavivienda@davivienda.com` no existe en tu cuenta) | Tecnología (brief §16 #4) | Sin alias el motor se niega a enviar (`aliasDisponible()`). Tiene que ser una dirección compartida cuyas respuestas lleguen a tu buzón; un noreply no sirve porque las respuestas por el mismo hilo son el corazón del diseño. |
| **Cupo diario real de envío** | Tecnología (#5) | Hoy `tope_correos_dia` es 1500 por defecto, sin verificar. |
| **¿Reemplaza al mail merge o conviven un ciclo?** | Jefatura (#7) | La decisión más difícil de revertir del proyecto. Define cómo se hace la marcha blanca. |
| **Quién produce el PDF y si seguirá igual** | Equipo (#6) | Define si el nombre sugerido llega a quien lo guarda. |

### Se necesita antes de la ingesta y la evidencia (Fase 2, segunda mitad)
| Qué | A quién |
|---|---|
| ¿Qué es "revisoría" y si es parada real del flujo? (#1) | Jefatura |
| ¿La evidencia puede vivir en Drive o riesgos exige el gestor documental? (#2) | Riesgos |
| Años de retención de la evidencia (#3) | Jefatura / Riesgos |
| ¿Arrancamos solo con ReteICA o con los 7 impuestos? (#8) | Jefatura (recomendación del brief: solo ReteICA) |

### Datos de ReteICA por confirmar con el equipo (no bloquean, pero afectan el envío)
- **717 obligaciones sin decisión de envío:** 653 `ENVIO_POR_DEFINIR` (forma de pago mixta, vacía u otra) y 64 `SIN_OFICINA` (8 municipios sin pareja en la hoja "Retención ICA": Magangué mensual, La Unión, San Pedro de los Milagros, Hispania, Morroa, Chocontá, Guasca cuatrimestral, entre otros). Hay que definir `requiere_envio_oficina` (SI/NO) en la hoja.
- **8 vencimientos sin periodo:** Simití (O, 17/04); Bello, Copacabana, La Estrella, Turbo y La Ceja del Tambo (columna de diciembre); Zaragoza (Q junio y W diciembre). Están en EXCEPCIONES con un borrador de correo y la hoja `REVISION_PERIODOS`.
- **Febrero → B6 del año anterior** (Yopal, Villavicencio): validar con el equipo.
- **Columna `Comentario` como régimen:** es texto libre (29 valores, varios son notas de plazo). Validar cuáles son regímenes reales. Si un municipio tiene dos regímenes, decidir si se manda un correo por régimen (afecta `ENVIOS`).
- **`jefe`:** no está en ninguna hoja de la fuente; queda vacío.

## Lo que sigue pendiente en el sistema

1. **Columnas de `ENVIOS`, `CONTACTOS`, `PLANTILLAS`, `CONCILIAR`:** son propuestas mías en `01_esquema.gs`; el brief no las define. Confírmalas **antes** de construir la Fase 2.
2. **Menú:** el proyecto de Apps Script es independiente, no vinculado al libro, así que el menú de `99_menu.gs` no aparece. Decidir si se vincula o se corre desde el editor.
3. **Filtro de Gmail** de `etiqueta_respuestas`: se crea a mano (ver `docs/instalacion.md`).
4. **Novedades de la fuente** (el calendario cambia un vencimiento ya congelado): todavía no se registran en EVENTOS.
5. **Caché de KPIs** (`CacheService`): corresponde a la Fase 3.
6. **Observador:** confirmar que `activarObservador()` quedó activo si quieres seguir recogiendo muestras de respuestas de revisoría.
7. `resumirExcepciones` cuenta "afectan a Retención ICA" solo por el texto "Retención ICA" en el detalle; es una aproximación.

## Seguridad y privacidad

- **Hoja "Claves"** de la copia del Excel (`datos/`): contiene usuarios y contraseñas de portales municipales. No se usaron ni se copiaron a ninguna parte, pero **bórrala de la copia** y, si ya estuvo compartida, considera cambiar esas contraseñas.
- La carpeta `datos/` está en `.gitignore` (también `.clasp.json` y `node_modules/`). No se sube al repositorio.
- `MUESTRAS` guarda cuerpos de correos completos: restringe el acceso al libro OPERACIÓN.
- Los ids de libro y carpetas viven en CONFIG y en las propiedades del script, no en el código.
