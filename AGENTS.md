# Guía de Agentes para AnitaByCitaMedica (ANITA Chatbot)

> **ATENCIÓN**: Este documento fue actualizado el 2026-02-21 para reflejar el estado real del código. La versión anterior tenía información desactualizada (flows inexistentes).

Este documento proporciona una visión general del proyecto AnitaByCitaMedica para que los agentes de Claude Code puedan entender rápidamente la estructura y trabajar de manera eficiente en futuras tareas.

## Visión General del Proyecto

**AnitaByCitaMedica** es el chatbot de WhatsApp del Dr. Kulinka. Gestiona reservas de turnos médicos y sobreturnos integrándose con el backend de **CitaMedicaBeta**.

- Framework: BuilderBot + Baileys (WhatsApp Web API)
- Runtime: Node.js + TypeScript
- DB: MongoDB (via MongoAdapter)
- HTTP Client: Axios con retry logic (30s timeout, 3 reintentos)
- Backend: `https://micitamedica.me/api`

---

## Sistema Completo

```
┌─────────────────────┐
│  Usuario WhatsApp   │
└──────────┬──────────┘
           │
           v
┌─────────────────────────────────────────┐
│      ANITA CHATBOT (Puerto 3008)        │
│  C:\Users\JorgeHaraDevs\Desktop\        │
│  AnitaByCitaMedica                      │
│  - Muestra turnos disponibles           │
│  - Reserva turnos normales              │
│  - Informa/reserva sobreturnos          │
└──────────┬──────────────────────────────┘
           │
           v
┌─────────────────────────────────────────┐
│   CitaMedicaBeta Backend                │
│   API: https://micitamedica.me/api      │
│   - Appointments API                    │
│   - Sobreturnos API                     │
│   - Tokens API                          │
│   - Google Calendar sync (interno)      │
└─────────────────────────────────────────┘
```

---

## Estructura Real del Proyecto (2026-02-21)

```
AnitaByCitaMedica/
├── src/
│   ├── app.ts                  # Punto de entrada + TODOS los flows activos inline
│   ├── flows/
│   │   ├── sobreturnoFlow.ts   # Flow de reserva de sobreturno (separado, INACTIVO en prod)
│   │   └── availableSlots.flow.ts
│   ├── utils/
│   │   ├── appointmentService.ts   # Cliente API turnos normales
│   │   ├── sobreturnoService.ts    # Cliente API sobreturnos (Singleton)
│   │   ├── cache.ts                # Cache en memoria
│   │   ├── dateFormatter.ts        # formatearFechaEspanol()
│   │   ├── botControl.ts
│   │   └── fallbackData.ts         # Datos de respaldo offline
│   ├── config/
│   │   ├── axios.ts                # axiosInstance con retry
│   │   └── app.ts                  # APP_CONFIG: PORT, TIMEZONE, MONGO_URI
│   └── types/
│       └── api.ts
├── CLAUDE.md                   # Instrucciones para Claude (LEER PRIMERO)
├── AGENTS.md                   # Este archivo
└── .env
```

> **IMPORTANTE**: Los flows `appointment.flow.ts`, `menu.flow.ts` y `gpt.flow.ts` NO EXISTEN en este proyecto. Toda la lógica está en `src/app.ts`.

---

## Flujos Activos en Producción

Registrados en `src/app.ts → main()`:

```typescript
const adapterFlow = createFlow([
    sobreTurnosTemporario,  // "sobreturno", "sobreturnos"
    welcomeFlow,            // saludos + "turnos", "turno"
    publicBookingLinkFlow,  // "bazinga", "link", "enlace"
    clientDataFlow,         // flow interno (datos del paciente)
    goodbyeFlow,            // "bye", "adiós", "chao"
    adminFlow,              // "!admin", "!help"
    //bookSobreturnoFlow    // COMENTADO - inactivo en prod
])
```

### `welcomeFlow` (hola, turnos, buenos días, etc.)
1. Verifica que no haya sesión activa en progreso
2. Calcula próximo día hábil:
   - Si hora > 20:30 → pasa al día siguiente
   - Salta sábado (6) y domingo (0)
3. Muestra horarios disponibles de turnos normales numerados (1, 2, 3...)
4. Si NO hay turnos → automáticamente consulta y ofrece sobreturnos disponibles
5. Usuario responde con número → `gotoFlow(clientDataFlow)`

### `clientDataFlow` (keyword interno: "datos_cliente")
Recolecta nombre + obra social, luego crea la reserva.
- Si `isSobreturnoMode = true` en state → crea sobreturno (`POST /sobreturnos`)
- Si no → crea turno normal (`POST /appointments`)

### `sobreTurnosTemporario` (sobreturno, sobreturnos)
- Informa cantidad disponible para el próximo día hábil
- Da teléfono: **3735604949**
- Genera token y da link: `https://micitamedica.me/reservar-turno?token=...`

### `publicBookingLinkFlow` (bazinga, link, enlace)
Genera token temporal y devuelve URL de reserva web.

### `adminFlow` (!admin, !help)
Solo accesible para `ADMIN_NUMBER` en env. Comandos: `!disconnect`, `!status`.

---

## Tipos de Citas

### Turnos Normales (`/api/appointments`)
- Horarios específicos a elección del paciente (ej: "11:15", "16:30")
- El backend define los slots disponibles (mañana y tarde)
- Se muestra una lista numerada al usuario, elige el número

### Sobreturnos (`/api/sobreturnos`) — Sistema de Tickets
- **NO son horarios a elección libre**: son tickets numerados 1-10
- El paciente elige "Sobreturno 3", no "11:30"
- **Turno Mañana (tickets 1-5)**: a partir de las 11:00
  - Sobreturno 1 → 11:00
  - Sobreturno 2 → 11:15
  - Sobreturno 3 → 11:30
  - Sobreturno 4 → 11:45
  - Sobreturno 5 → 12:00
- **Turno Tarde (tickets 6-10)**: a partir de las 19:00
  - Sobreturno 6 → 19:00
  - Sobreturno 7 → 19:15
  - Sobreturno 8 → 19:30
  - Sobreturno 9 → 19:45
  - Sobreturno 10 → 20:00

---

## Autenticación con el Backend

- **API Key**: Header `X-API-Key: <CHATBOT_API_KEY>` (env var)
- Configurado globalmente en `src/config/axios.ts`
- También se usa en llamadas directas `fetch()` dentro de `app.ts`

---

## Endpoints Usados por el Chatbot

| Endpoint | Descripción |
|----------|-------------|
| `GET /appointments/available/:date` | Horarios disponibles para turnos |
| `POST /appointments` | Crear turno normal |
| `GET /sobreturnos/date/:date` | Sobreturnos disponibles (respuesta: `{success, data: {disponibles: [{numero, ...}]}}`) |
| `GET /sobreturnos/available/:date` | Disponibilidad detallada con `isAvailable` |
| `GET /sobreturnos/validate` | Validar disponibilidad (`?date=&sobreturnoNumber=`) |
| `GET /sobreturnos/validate/:numero` | Validar número específico |
| `GET /sobreturnos/status/:date` | Estado completo (`{data: {reservados: [], total, disponibles}}`) |
| `POST /sobreturnos` | Crear sobreturno |
| `POST /sobreturnos/cache/clear` | Limpiar caché del backend |
| `POST /tokens/generate-public-token` | Generar token público para web |

---

## Servicios Clave

### `sobreturnoService.ts` (Singleton — `SobreturnoService.getInstance()`)

```typescript
getAvailableSobreturnos(date)      // → APIResponseWrapper con isAvailable por slot
createSobreturno(data)             // → APIResponseWrapper
isSobreturnoAvailable(date, num)   // → boolean
getReservedSobreturnos(date)       // → SobreturnoResponse[]
getSobreturnosStatus(date)         // → {data: {reservados, total, disponibles}}
clearDateCache(date)               // limpia caché local de esa fecha
```

Tiene modo offline con caché (`./cache.ts`).

### `appointmentService.ts`

```typescript
getReservedSlots(date)    // → string[] (horarios tipo "11:15")
createAppointment(data)   // → APIResponseWrapper
```

---

## Estado de Conversación (State) — Variables Clave

```typescript
{
    clientName: string,
    socialWork: string,
    appointmentDate: string,      // 'yyyy-MM-dd'
    availableSlots: TimeSlot[],   // Turnos normales
    availableSobreturnos: any[],  // Sobreturnos (array de {numero})
    isSobreturnoMode: boolean,
    selectedSlot: TimeSlot,
    selectedSobreturno: any,      // {numero: number}
    invalidName: boolean,
    disponiblesManiana: any[],
    disponiblesTarde: any[],
}
```

---

## Obras Sociales (enum fijo)

```
'1': 'INSSSEP'
'2': 'Swiss Medical'
'3': 'OSDE'
'4': 'Galeno'
'5': 'CONSULTA PARTICULAR'
'6': 'Otras Obras Sociales'
```

---

## Configuración Importante

- **Timezone**: `America/Argentina/Buenos_Aires`
- **Puerto bot**: 3008
- **Puerto Express health**: 3009
- **Próximo día hábil**: Si hora > 20:30 → siguiente día. Salta sábado y domingo.
- **Teléfono consultorio**: 3735604949

---

## Variables de Entorno (.env)

```env
MONGODB_URI=mongodb://...
CHATBOT_API_KEY=...
PORT=3008
```

---

## Comandos de Desarrollo

```bash
npm run dev           # nodemon (hot reload)
npm run build         # Compila TypeScript
npm run start         # Producción
npx tsc --noEmit      # Verificar tipos sin compilar
npm run pm2:start     # Iniciar con PM2
npm run pm2:restart   # Reiniciar
npm run pm2:logs      # Ver logs
```

---

## Historial de Decisiones Clave

### Commit fc40f0c (Oct 2025): Auto-asignación de sobreturno
`sobreturnoFlow.ts` fue modificado para auto-asignar el primer sobreturno disponible según hora:
- Antes de las 12:00 → prioriza mañana (1-5), luego tarde (6-10)
- Después de las 12:00 → prioriza tarde (6-10), luego mañana (1-5)

**Estado actual**: Este flow está comentado en producción. El flujo activo es `sobreTurnosTemporario` que redirige a web/teléfono.

### Estado del archivo `src/flows/sobreturnoFlow.ts`
Implementación completa de reserva directa (muestra disponibles, usuario elige número, crea reserva). **NO está activo** en producción (comentado en `main()` de app.ts).

---

## Convenciones

- Logs con prefijos: `[SOBRETURNO]`, `[SOBRETURNO FLOW]`, `[SOBRETURNO SERVICE]`, `[PUBLIC LINK]`, `[DEBUG]`, `[ERROR]`
- Fechas para API: `'yyyy-MM-dd'`
- Fechas para usuario: `formatearFechaEspanol()` → "domingo 19 de enero de 2026"
- Horarios: `'HH:mm'` (24h)
- **NO modificar textos de flows sin autorización explícita del cliente**

---

## Archivos de Referencia Clave (en orden de lectura)

1. **CLAUDE.md** — Protocolo de trabajo obligatorio
2. **src/app.ts** — Todos los flows activos y lógica de reserva (inline)
3. **src/utils/sobreturnoService.ts** — Lógica de sobreturnos
4. **src/flows/sobreturnoFlow.ts** — Flow de sobreturno (inactivo, referencia)
5. **src/utils/appointmentService.ts** — Lógica de turnos normales
6. **src/config/axios.ts** — Configuración HTTP con retry

---

**Última actualización**: 2026-02-21
