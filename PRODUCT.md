# SINAV — contexto de producto

Sistema de control de obligaciones tributarias territoriales del Departamento de
Impuestos de Banco Davivienda. Vive en un Google Sheets llamado SINAV con Apps
Script enlazado (Extensiones → Apps Script) y una aplicación web encima.

Equipo piloto: 6 personas. Producción: 1 de diciembre de 2026.

## Qué hace

1. Manda a las oficinas del banco en cada municipio el correo con la declaración
   adjunta, para que la presenten y paguen.
2. Detecta cuándo la oficina responde con el soporte sellado.
3. Avisa antes de que se venza una obligación.

El equipo ya notifica hoy por correo. SINAV no agrega un canal: instrumenta el
que existe. **Si una función le pide al usuario un dato que ya está en un correo,
está mal pensada.**

## Quién lo usa

- **PROFESIONAL** (4): trabaja sus propias obligaciones. Sesión larga, todos los
  días, en computador. Sube el soporte y envía. Ve las ajenas solo de lectura.
- **JEFE** (1): asigna responsables y da el visto bueno (REVISADA, APROBADA).
- **ADMIN** (1): además edita CONFIG y USUARIOS.

El rol se resuelve en el servidor con `Session.getActiveUser().getEmail()` contra
la hoja USUARIOS. Nunca se confía en el rol que mande el cliente.

## La restricción que define la arquitectura

No se pueden crear alias ni buzones compartidos en este dominio. Cada correo sale
de la cuenta de quien lo envía, con "Impuestos Davivienda" como nombre visible, y
la respuesta vuelve a SU bandeja. De ahí:

- La aplicación web se despliega **ejecutando como el usuario que accede**.
- Todos necesitan permiso de edición sobre el libro; el control de roles es
  lógica de servidor, no permisos de archivo.
- Los disparadores son por persona: la app le crea el suyo a cada profesional al
  entrar, y hay un botón "Revisar respuestas ahora" como respaldo.
- La cuota es por persona: 1.500 destinatarios diarios cada uno, con contador.
- **El `hilo_id` de Gmail se guarda en el momento del envío.** Es la pieza
  central: cuando la oficina responde sobre ese hilo, ya se sabe a qué
  obligación pertenece.

## Los objetos

- **OBLIGACIONES** — el maestro. Una fila por obligación y periodo, con id
  `cod_dane|impuesto|regimen|periodo`. 2.285 filas en el origen real; en pruebas
  se usan tres. Nunca fórmulas vivas: los valores se copian al crear la fila y
  quedan congelados, porque son evidencia.
- **EVENTOS** — el log, append-only, lo escribe solo el programa. Una obligación
  no es un envío: el reenvío número 21 es un registro en EVENTOS.
- **USUARIOS**, **CONFIG** — correo, nombre, rol, activo; parámetro, valor.

## Magnitudes reales

- 1.100 municipios posibles; el piloto mueve del orden de 200 obligaciones al mes.
- Impuestos: RETEICA, AUTORRETEICA, ICA, EXOGENA.
- Periodicidades: MENSUAL, BIMESTRAL, TRIMESTRAL, CUATRIMESTRAL, ANUAL.
- Avisos a 10, 4, 2 y 0 días del vencimiento.

## Trampas del origen, ya descubiertas

1. El NIT del calendario es **del municipio**, no del banco: la columna `Empresa`
   dice "BANCO DAVIVIENDA S.A" en las 2.285 filas. Se llama `nit_municipio`.
2. La asignación no se guarda como inicial. Una letra ya sobrevivió a dos
   cambios de titular. El responsable es el correo corporativo.
3. `cod_oficina` y `cod_dane` son **texto**: "0851" no es 851.
4. Periodicidad sucia en el origen (`ANUAL`, `Anual`, `MENSUAL `). Se normaliza
   en la entrada, no en cada consumo.
5. Nada de IMPORTRANGE ni VLOOKUP vivos en el maestro.
6. Una obligación no es un envío.

## Supuestos (fase 1)

- `modo = PRUEBA` es el valor por defecto y no se cambia desde el código: en
  PRUEBA todos los correos van al propio usuario.
- Despliegue: ejecutar como el usuario que accede, acceso a cualquiera del dominio.
- Etiqueta de Gmail `SINAV` para acotar `GmailApp.search`.
- `periodo` válido: `YYYY-MM`, `YYYY-Bn`, `YYYY-Tn`, `YYYY-Cn`, `YYYY`.
- Tres columnas añadidas al maestro que la máquina de estados exige y la lista
  original no traía: `motivo_devuelta`, `estado_previo`, `reprocesos`.
