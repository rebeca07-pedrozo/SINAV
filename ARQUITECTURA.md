# SINAV · arquitectura y flujos

Los diagramas están en Mermaid, que GitHub dibuja solo al abrir este archivo.
Si los ves como texto, es que los estás mirando en un editor sin Mermaid.

- [1 · Arquitectura](#1--arquitectura-de-donde-sale-cada-cosa)
- [2 · De dónde salen las obligaciones](#2--de-donde-salen-las-obligaciones)
- [3 · Estados de una obligación](#3--estados-de-una-obligacion-uml-de-estados)
- [4 · Envío de una declaración](#4--envio-de-una-declaracion-uml-de-secuencia)
- [5 · La respuesta de la alcaldía](#5--la-respuesta-de-la-alcaldia)
- [6 · Permisos](#6--permisos-quien-puede-que)
- [7 · Ausencias y backups](#7--ausencias-y-backups)
- [8 · Las hojas y quién escribe en cada una](#8--las-hojas-y-quien-escribe-en-cada-una)

---

## 1 · Arquitectura: de dónde sale cada cosa

No hay servidor propio ni base de datos: todo vive dentro de la cuenta de
Google del banco. El Sheets **es** la base de datos, Apps Script **es** el
backend, y la aplicación web se sirve desde el mismo proyecto.

```mermaid
flowchart TB
    subgraph nav["Navegador · la persona"]
        UI["Aplicación web<br/>React 18 + htm desde CDN<br/>Enviar · Carga masiva · Respuestas<br/>Alertas · Asignación · Ausencias · Métricas"]
    end

    subgraph as["Apps Script · el backend"]
        API["Capa api…()<br/>apiInicio, apiEnviar, apiSubirSoporte,<br/>apiRespuestas, apiMetricas…"]
        REGLAS["Reglas<br/>06_Estados · 03_Roles · 04_Normalizar"]
        IO["Acceso a datos<br/>02_Hojas · LockService"]
        TRIG["Activadores<br/>cargarMesVigente (día 1)"]
    end

    subgraph goog["Google · la infraestructura"]
        SHEET[("Google Sheets<br/>9 hojas")]
        DRIVE[("Drive<br/>soportes y sellados")]
        GMAIL["Gmail<br/>buzón de cada persona"]
    end

    ALC["Alcaldías<br/>315 municipios"]

    UI -- "google.script.run" --> API
    API --> REGLAS
    REGLAS --> IO
    IO <--> SHEET
    API <--> DRIVE
    API <--> GMAIL
    TRIG --> IO
    GMAIL -. "la declaración" .-> ALC
    ALC -. "la respuesta sellada" .-> GMAIL
```

**Lo que hay que entender de este dibujo:**

- La interfaz **nunca** toca las hojas. Todo pasa por la capa `api…()`, y ahí
  se valida el permiso. Esconder un botón no es seguridad.
- El despliegue es **«ejecutar como el usuario que accede»**. Por eso el correo
  sale del buzón de cada quien, con su cuota, y la respuesta llega a su
  bandeja. Es la pieza que haría difícil mover esto a otra tecnología.
- El activador del día 1 escribe en las hojas **sin que nadie esté
  conectado**, con la cuenta de quien lo instaló.

---

## 2 · De dónde salen las obligaciones

El año entero son 6.320 obligaciones, y el libro las lee todas en cada
pantalla aunque después se filtren. Por eso OBLIGACIONES guarda **el mes en
curso y el siguiente**, no el año.

```mermaid
flowchart LR
    EXCEL["5 Excel del equipo<br/>+ calendario tributario"]
    CAL[("CALENDARIO<br/>2.285 filas<br/>cuándo se vence")]
    PROG[("PROGRAMACION<br/>1.269 reglas<br/>quién · a qué correo · qué NIT")]
    OBL[("OBLIGACIONES<br/>~1.000 filas<br/>el mes en curso y el siguiente")]
    HIST[("HISTORICO<br/>lo cerrado de meses anteriores")]

    MES{{"cargarMesVigente()<br/>el 1 de cada mes, 5am"}}

    EXCEL -- "se pega a mano,<br/>una vez al año" --> CAL
    CAL -- "cargarProgramacion()<br/>UNA vez en la vida" --> PROG
    CAL -- "las fechas" --> MES
    PROG -- "quién y a dónde" --> MES
    MES --> OBL
    OBL -- "archivarCerradas()<br/>a mano, cuando pese" --> HIST
```

**El criterio es la fecha de vencimiento, no el periodo.** Lo que toca
trabajar en noviembre es lo que se vence en noviembre, aunque el periodo
declarado sea de octubre.

---

## 3 · Estados de una obligación (UML de estados)

Lo que no está en este grafo **no pasa**: `validarPaso()` rechaza cualquier
salto que no esté dibujado aquí.

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE : carga mensual

    PENDIENTE --> LISTA : se sube el soporte
    LISTA --> ENVIADA : revisión del PDF + correo enviado

    ENVIADA --> RESPONDIDA : la alcaldía contesta el hilo
    ENVIADA --> REBOTADO : el correo no llegó
    ENVIADA --> SIN_EVIDENCIA : nunca contestaron

    SIN_EVIDENCIA --> RESPONDIDA : contestan tarde
    REBOTADO --> LISTA : se corrige el correo

    RESPONDIDA --> REVISADA : la jefa la revisa
    RESPONDIDA --> DEVUELTA : algo está mal
    REVISADA --> APROBADA : queda cerrada
    REVISADA --> DEVUELTA : algo está mal
    DEVUELTA --> LISTA : se corrige y se reenvía

    APROBADA --> [*]

    note right of LISTA
        El soporte solo se puede
        poner o cambiar en
        PENDIENTE, LISTA,
        DEVUELTA y REBOTADO
    end note
```

`APROBADA` no tiene salida: es el final. Y de `PENDIENTE` solo se sale
subiendo el soporte — **sin soporte no hay envío, sin excepción**.

---

## 4 · Envío de una declaración (UML de secuencia)

Aquí está la parte que más se ha tocado, y la que conviene no deshacer: **la
revisión del PDF es la última puerta, no la primera**.

```mermaid
sequenceDiagram
    actor P as Profesional
    participant UI as Aplicación web
    participant API as Apps Script
    participant D as Drive
    participant S as Sheets
    participant G as Gmail
    actor A as Alcaldía

    P->>UI: arrastra el PDF en su fila
    UI->>API: apiSubirSoporte
    API->>D: guarda en vigencia/municipio/impuesto
    API->>S: soporte_id, estado = LISTA
    Note over API,S: se borra soporte_revisado:<br/>archivo nuevo, revisión nueva
    API-->>UI: la casilla de la fila se activa

    P->>UI: marca filas y pulsa «Enviar seleccionadas»
    UI->>API: apiSoportesParaRevisar
    API-->>UI: los PDF, uno por uno
    Note over P,UI: NO sale ningún correo todavía

    alt el PDF es el correcto
        P->>UI: CORRECTO
        UI->>API: apiMarcarSoporte(correcto)
        API->>S: soporte_revisado = soporte_id
    else el PDF no corresponde
        P->>UI: INCORRECTO
        UI->>API: apiMarcarSoporte(incorrecto)
        API->>S: borra soporte_id, vuelve a PENDIENTE
        API-->>UI: cierra el visor, la fila pide subir soporte
    end

    P->>UI: confirma el envío
    UI->>API: apiEnviar
    API->>API: puedeEnviar() + soporteRevisado()
    Note over API: se valida en el SERVIDOR:<br/>una llamada directa a la API<br/>se rechaza igual
    API->>G: correo desde el buzón de la persona
    G->>A: declaración + soporte adjunto
    API->>S: hilo_id, estado = ENVIADA
    API->>S: EVENTOS: ENVIADA
```

---

## 5 · La respuesta de la alcaldía

```mermaid
flowchart TB
    START(["Revisar respuestas<br/>a mano o por activador"]) --> Q1{"¿la obligación<br/>tiene hilo_id?"}
    Q1 -- no --> FIN1["se ignora:<br/>sin hilo no se puede<br/>saber a qué pertenece"]
    Q1 -- sí --> HILO["se abre ESE hilo de Gmail,<br/>no se busca en la bandeja"]
    HILO --> Q2{"¿hay mensajes<br/>nuevos?"}
    Q2 -- no --> FIN2["queda en ENVIADA"]
    Q2 -- sí --> Q3{"¿traen<br/>adjunto?"}
    Q3 -- sí --> SELLO["se guarda en Sellados<br/>y se puede abrir desde<br/>la pantalla Respuestas"]
    Q3 -- no --> SOLO["se registra el texto<br/>de la respuesta"]
    SELLO --> RESP["estado = RESPONDIDA"]
    SOLO --> RESP
    RESP --> JEFA{"la jefa revisa"}
    JEFA -- "está bien" --> OK["REVISADA → APROBADA"]
    JEFA -- "está mal" --> NO["DEVUELTA → se corrige"]
```

**Por qué el hilo y no una búsqueda en la bandeja:** el hilo ya dice a qué
obligación pertenece la respuesta. Buscar por asunto o por remitente sería
adivinar, y una declaración sellada archivada en el municipio equivocado es un
error que se descubre meses después.

---

## 6 · Permisos: quién puede qué

```mermaid
flowchart LR
    subgraph perfiles["PERFIL = rol + nivel"]
        ADMIN["ADMIN<br/>Rebeca"]
        P3["PROFESIONAL-III<br/>Elizabeth, la jefa"]
        P1["PROFESIONAL-I<br/>Helen · Jesús · Andrea · Yasneidy"]
    end

    subgraph acciones["Acciones"]
        A1["trabajar lo mío:<br/>subir soporte, enviar,<br/>digitalizar campos"]
        A2["asignar · revisar ·<br/>editar y enviar ajenas ·<br/>ver métricas ·<br/>gestionar ausencias ·<br/>habilitar vigencia"]
        A3["configurar"]
    end

    P1 --> A1
    P3 --> A1
    P3 --> A2
    ADMIN --> A1
    ADMIN --> A2
    ADMIN --> A3
```

El permiso se valida **en el servidor**, en `exige()`, dentro de cada
`api…()`. La interfaz esconde botones por comodidad, no por seguridad.

Quien entra por primera vez con un correo del dominio se da de alta solo como
`PROFESIONAL-I`. Subir a alguien de nivel es a mano, en la hoja USUARIOS.

---

## 7 · Ausencias y backups

```mermaid
sequenceDiagram
    actor J as Jefa / Admin
    participant UI as Pantalla Ausencias
    participant API as Apps Script
    participant S as Sheets

    J->>UI: Yasneidy, del 1 al 15 de diciembre
    UI->>API: apiPrevisualizarAusencia
    API->>S: ¿qué vence en ese rango?
    API-->>UI: 23 obligaciones pasarían a Andrea
    Note over J,UI: se ve ANTES de confirmar
    J->>UI: confirmar
    UI->>API: apiRegistrarAusencia
    API->>S: responsable = Andrea
    API->>S: titular_original = Yasneidy
    API->>S: AUSENCIAS: una fila, no se borra nunca

    Note over API,S: al vencer la ausencia,<br/>cerrarAusenciasVencidas()<br/>las devuelve solas
```

El backup sale de la columna `backup` de USUARIOS, y si está vacía, de los
pares del código: **Andrea ↔ Yasneidy** y **Jesús ↔ Helen**. La hoja manda
sobre el código, para poder cambiarlo sin tocar nada.

---

## 8 · Las hojas y quién escribe en cada una

```mermaid
flowchart TB
    subgraph fuente["Fuente de datos · se pega o se genera"]
        CAL["CALENDARIO<br/>las fechas"]
        PROG["PROGRAMACION<br/>quién y a dónde"]
    end
    subgraph vivo["El día a día · las escribe la aplicación"]
        OBL["OBLIGACIONES"]
        AUS["AUSENCIAS"]
        EVE["EVENTOS<br/>log, nunca se borra"]
    end
    subgraph config["Configuración · a mano"]
        USU["USUARIOS<br/>perfiles y backups"]
        CFG["CONFIG<br/>modo, vigencia, logo"]
        VIG["VIGENCIAS<br/>5 carpetas de Drive por año"]
        ROL["ROLES<br/>solo documentación"]
    end

    CAL --> OBL
    PROG --> OBL
    USU --> OBL
    AUS --> OBL
    OBL --> EVE
    VIG --> DRIVE[("Drive")]
    OBL --> DRIVE
```

| Hoja | Para qué | Quién la toca |
|---|---|---|
| **CALENDARIO** | Las fechas de vencimiento. No la lee la interfaz | Se pega una vez al año |
| **PROGRAMACION** | Quién responde, a qué correo, qué NIT | A mano, cuando algo cambia |
| **OBLIGACIONES** | El mes en curso y el siguiente | El activador la llena, la app la mueve |
| USUARIOS | Quién entra, su perfil, su backup | A mano |
| ROLES | Qué puede cada perfil. Documentación | Nadie |
| VIGENCIAS | Los 5 ids de carpetas de Drive por año | Al habilitar un año |
| AUSENCIAS | Vacaciones y traspasos. No se borra | La app |
| CONFIG | Modo PRUEBA/PRODUCCION, vigencia, logo | A mano |
| EVENTOS | El log de todo. Append-only | La app |
| HISTORICO | Lo cerrado que se archivó. Aparece sola | `archivarCerradas()` |
