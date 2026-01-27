# Guía de Agentes para AnitaByCitaMedica

Este documento proporciona una visión general del proyecto AnitaByCitaMedica para que los agentes de Claude Code puedan entender rápidamente la estructura y trabajar de manera eficiente en futuras tareas.

## Visión General del Proyecto

**AnitaByCitaMedica** es un chatbot de WhatsApp para gestión de citas médicas del consultorio del Dr. Daniel Kulinka con las siguientes características:

- Bot conversacional en WhatsApp usando BuilderBot framework
- Integración completa con CitaMedicaBeta backend API
- Generación automática de tokens públicos para reservas
- Envío de links personalizados a pacientes
- Gestión de citas regulares y sobreturnos
- Conexión con MongoDB para persistencia

## Arquitectura del Sistema

```
AnitaByCitaMedica/
├── src/                # Código fuente TypeScript
│   ├── app.ts          # Entry point, configuración del bot
│   ├── flows/          # Flujos de conversación
│   ├── utils/          # Servicios y utilidades
│   ├── scripts/        # Scripts auxiliares
│   ├── config/         # Configuración (axios, app)
│   └── types/          # Definiciones TypeScript
├── bot_sessions/       # Sesiones de WhatsApp (gitignored)
├── .env                # Variables de entorno
├── CLAUDE.md           # Instrucciones para Claude Code (LEER PRIMERO)
├── AGENTS.md           # Este archivo
└── .claude/            # Configuración de Claude Code
```

### Sistema Completo

```
┌─────────────────────┐
│  Usuario WhatsApp   │
│  (Paciente)         │
└──────────┬──────────┘
           │
           v
┌─────────────────────────────────────────┐
│   ANITACHATBOT (Puerto 3008)            │
│   Chatbot de WhatsApp                   │
│   - Captura datos del paciente          │
│   - Genera tokens públicos              │
│   - Envía links de reserva              │
│   - Gestiona flujos conversacionales    │
└──────────┬──────────────────────────────┘
           │
           v
┌─────────────────────────────────────────┐
│   CitaMedicaBeta API (Puerto 3001)      │
│   - POST /api/auth/generate-public-token│
│   - GET /api/sobreturnos/date/:date     │
│   - POST /api/sobreturnos               │
│   - GET /api/appointments/available/:date│
│   - POST /api/appointments              │
└──────────┬──────────────────────────────┘
           │
           v
    ┌──────┴──────┐
    │             │
    v             v
┌─────────┐  ┌──────────────┐
│ MongoDB │  │ Google       │
│         │  │ Calendar API │
└─────────┘  └──────────────┘
```

## BuilderBot Framework

### Conceptos Clave

**BuilderBot** es un framework para crear chatbots conversacionales en WhatsApp.

**Componentes principales:**
1. **Provider**: Maneja la conexión con WhatsApp (Baileys)
2. **Database**: Almacena conversaciones y estado (MongoDB)
3. **Flows**: Define los flujos de conversación
4. **Bot**: Instancia principal que une todo

**Estructura de un Flow:**
```typescript
import { addKeyword } from '@builderbot/bot';

export const myFlow = addKeyword(['keyword'])
    .addAnswer('Mensaje de respuesta')
    .addAction(async (ctx, { flowDynamic, gotoFlow, fallBack }) => {
        // Lógica personalizada
    });
```

## Flujos de Conversación

### 1. appointment.flow.ts (Flujo Principal)

**Propósito**: Gestiona el proceso completo de agendamiento de citas y sobreturnos.

**Flujo de Trabajo**:
```
1. Usuario saluda al bot ("hola", "buenos días", etc.)
2. Bot pregunta nombre completo
3. Bot pregunta obra social
4. Bot pregunta número de teléfono
5. Bot genera token público (POST /api/auth/generate-public-token)
6. Bot envía link personalizado con token
   - Para sobreturnos: /seleccionar-sobreturno?token=XXX
   - Para citas: /agendar-turno?token=XXX
7. Usuario hace clic en link y completa reserva en web
8. Bot confirma recepción de datos
```

**Keywords que activan el flujo**:
- 'hola', 'buenos días', 'buenas tardes', 'buenas noches'
- 'ola', 'hola!', 'hey'
- 'quiero un turno', 'necesito una cita'
- 'agendar', 'reservar'

**Estados del flujo**:
```typescript
// Captura de datos
name: string          // Nombre del paciente
obraSocial: string    // Obra social
phone: string         // Teléfono
```

### 2. menu.flow.ts (Menú Principal)

**Propósito**: Proporciona información general del consultorio.

**Opciones del menú**:
- Información de contacto
- Horarios de atención
- Ubicación del consultorio
- Obras sociales aceptadas
- Volver al menú principal

**Keywords**:
- 'menu', 'menú', 'opciones'
- 'ayuda', 'help'
- 'información', 'info'

### 3. gpt.flow.ts (Asistente IA)

**Propósito**: Respuestas inteligentes usando OpenAI GPT.

**Características**:
- Responde preguntas generales sobre el consultorio
- Tono amigable y profesional
- Contextualiza respuestas sobre servicios médicos
- Deriva a flujos específicos cuando es necesario

## Servicios de API

### appointmentService.ts

**Funciones principales**:
```typescript
// Obtener horarios disponibles
getAvailableTimes(date: string): Promise<string[]>

// Crear cita regular
createAppointment(data: AppointmentData): Promise<Appointment>

// Verificar disponibilidad
checkAvailability(date: string, time: string): Promise<boolean>
```

### sobreturnoService.ts

**Funciones principales**:
```typescript
// Obtener sobreturnos disponibles por fecha
getSobreturnosByDate(date: string): Promise<SobreturnoResponse>

// Crear sobreturno
createSobreturno(data: SobreturnoData): Promise<Sobreturno>

// Validar disponibilidad de sobreturno
validateSobreturno(date: string, numero: number): Promise<boolean>
```

**Respuesta de getSobreturnosByDate**:
```typescript
{
  success: true,
  data: {
    disponibles: [
      { numero: 1, horario: '11:00', turno: 'mañana' },
      { numero: 2, horario: '11:15', turno: 'mañana' },
      // ... hasta 10 sobreturnos (5 mañana, 5 tarde)
    ],
    totalDisponibles: number,
    fecha: string
  }
}
```

## Integración con CitaMedicaBeta API

### Autenticación

**Método**: API Key en header
```typescript
headers: {
  'X-API-Key': process.env.CHATBOT_API_KEY
}
```

### Generación de Token Público

**Endpoint**: `POST /api/auth/generate-public-token`

**Request**:
```typescript
{
  // Sin body, solo headers con API Key
}
```

**Response**:
```typescript
{
  success: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  expiresIn: "7h"
}
```

**Uso del token**:
```typescript
const link = `https://micitamedica.me/seleccionar-sobreturno?token=${token}`;
await flowDynamic(link);
```

### Manejo de Errores

**Retry Logic** (configurado en `config/axios.ts`):
- Timeout: 30 segundos
- Reintentos: 3 intentos
- Backoff: Exponencial (1s, 2s, 4s)
- Reintentar en: Network errors, 5xx, 408, 429

**Patrón de manejo**:
```typescript
try {
  const result = await service.method();
  await flowDynamic('✅ Operación exitosa');
} catch (error) {
  console.error('[ERROR] API call failed:', error);
  await flowDynamic('❌ Ocurrió un error. Por favor intenta nuevamente en unos minutos.');
  return fallBack();
}
```

## Estructura de Datos

### AppointmentData (Cita Regular)
```typescript
interface AppointmentData {
  clientName: string;      // Nombre completo
  socialWork: string;      // Obra social
  phone: string;           // Teléfono con código país
  date: string;            // YYYY-MM-DD
  time: string;            // HH:mm
  email?: string;          // Opcional
  isSobreturno: false;
}
```

### SobreturnoData (Sobreturno)
```typescript
interface SobreturnoData {
  clientName: string;
  socialWork: string;
  phone: string;
  date: string;            // YYYY-MM-DD
  sobreturnoNumber: number; // 1-10
  isSobreturno: true;
  // El horario se calcula automáticamente en backend
}
```

### Patient (Datos capturados en chat)
```typescript
interface Patient {
  name: string;          // Nombre completo del paciente
  phone: string;         // Teléfono (capturado de ctx.from)
  obrasocial: string;    // Obra social seleccionada
}
```

## Configuración del Entorno

### Variables de Entorno (.env)
```env
# MongoDB
MONGODB_URI=mongodb://username:password@host:port/database

# API Integration
API_URL=https://micitamedica.me/api
CHATBOT_API_KEY=your-chatbot-api-key

# Bot Configuration
PORT=3008

# OpenAI (para GPT flow)
OPENAI_API_KEY=sk-...
```

### Puertos
- **3008**: Puerto del chatbot (WhatsApp bot)
- **3009**: Puerto de Express (health checks, APIs internas)
- **3001**: Puerto de CitaMedicaBeta backend (externo)

## Comandos Útiles

### Desarrollo
```bash
npm run dev        # Inicia bot con nodemon (hot reload)
npm run start      # Inicia bot en modo producción
npm run build      # Compila TypeScript a dist/
npm run lint       # Verifica código con ESLint
```

### Producción (PM2)
```bash
npm run pm2:start     # Inicia con PM2
npm run pm2:restart   # Reinicia bot
npm run pm2:stop      # Detiene bot
npm run pm2:logs      # Ver logs en tiempo real
npm run pm2:delete    # Elimina proceso PM2
```

### Testing Manual
1. Iniciar bot: `npm run dev`
2. Escanear QR en terminal con WhatsApp
3. Enviar mensaje de prueba al número del bot
4. Verificar logs en consola

## Archivos de Referencia Clave

Para entender rápidamente el sistema, lee estos archivos en orden:

1. **CLAUDE.md** - Instrucciones completas para Claude Code
2. **src/app.ts** - Entry point, configuración del bot
3. **src/flows/appointment.flow.ts** - Flujo principal de agendamiento
4. **src/utils/appointmentService.ts** - Cliente API para citas
5. **src/utils/sobreturnoService.ts** - Cliente API para sobreturnos
6. **src/config/axios.ts** - Configuración HTTP

## Documentación Detallada

Para información más detallada sobre áreas específicas:

- **Chatbot**: Ver `SUBAGENTS.md` (detalles de flows, utils, scripts)
- **API Backend**: Proyecto separado en `C:\Users\JorgeHaraDevs\Desktop\CitaMedicaBeta`
- **BuilderBot Framework**: https://builderbot.vercel.app/

## Convenciones de Desarrollo

### No Hacer
- ❌ NO crear archivos .md innecesarios
- ❌ NO usar emojis a menos que el usuario lo solicite
- ❌ NO modificar archivos del backend (repo separado)
- ❌ NO cambiar flujos de conversación sin probar
- ❌ NO exponer datos sensibles en logs
- ❌ NO cambiar configuración de API sin consultar
- ❌ **CRÍTICO: NO MODIFICAR TEXTOS DE FLOWS** - Los mensajes al usuario están validados por el cliente y son intocables

### Hacer
- ✅ Seguir patrones establecidos (ver flows existentes)
- ✅ Usar mensajes claros y amigables en español
- ✅ Validar entrada de usuario antes de procesar
- ✅ Manejar errores con try-catch y mensajes claros
- ✅ Logging con prefijos `[DEBUG]`, `[ERROR]`, `[WARN]`
- ✅ Usar TypeScript types correctamente
- ✅ Verificar tipos con `npx tsc --noEmit` antes de commit

## URLs de Producción

- **Chatbot**: Puerto local 3008 (no expuesto públicamente)
- **Backend API**: https://micitamedica.me/api
- **Frontend Web**: https://micitamedica.me
- **Página de Sobreturnos**: https://micitamedica.me/seleccionar-sobreturno?token=XXX
- **Página de Citas**: https://micitamedica.me/agendar-turno?token=XXX

## Notas Importantes

1. **Sesiones de WhatsApp**: Se almacenan en `bot_sessions/`, no commitear al repo
2. **QR Code**: En primera ejecución, escanear QR desde WhatsApp móvil
3. **Token Público**: Válido 7 horas, generado para cada conversación
4. **MongoDB**: Requerido para persistencia de conversaciones
5. **Retry Logic**: Configurado para manejar timeouts de CitaMedicaBeta API
6. **Timezone**: America/Argentina/Buenos_Aires (coherente con backend)
7. **Sobreturnos**: 10 slots fijos por día (5 mañana, 5 tarde)
8. **Horarios Mañana**: 11:00, 11:15, 11:30, 11:45, 12:00
9. **Horarios Tarde**: 19:00, 19:15, 19:30, 19:45, 20:00

## Logs y Debugging

### Archivos de Log
- `baileys.log` - Logs de Baileys (WhatsApp provider)
- `core.class.log` - Logs del core de BuilderBot
- `queue.class.log` - Logs de cola de mensajes

### Prefijos de Log
```typescript
console.log('[DEBUG]', 'Mensaje de debug');
console.error('[ERROR]', 'Mensaje de error:', error);
console.warn('[WARN]', 'Advertencia');
```

### Debugging de Flujos
```typescript
// En flows
.addAction(async (ctx, { flowDynamic }) => {
    console.log('[DEBUG] Context:', ctx);
    console.log('[DEBUG] User input:', ctx.body);
    console.log('[DEBUG] User phone:', ctx.from);
    // ...
});
```

## Última Actualización

- **Fecha**: 2026-01-20
- **Cambio**: Documentación inicial del proyecto AnitaByCitaMedica
- **Archivos nuevos**: `CLAUDE.md`, `AGENTS.md`, `SUBAGENTS.md`
- **Propósito**: Facilitar trabajo de agentes de Claude Code
