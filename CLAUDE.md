# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ PROTOCOLO OBLIGATORIO DE TRABAJO

**CONTEXTO CRÍTICO**: Este proyecto es el chatbot ANITA que está en **PRODUCCIÓN** integrado con CitaMedicaBeta. Todos los cambios son pequeños, incrementales y quirúrgicos. El cliente solicita mejoras sutiles o complementos al código existente. Un error cuesta días de trabajo y afecta a pacientes reales.

**REGLA FUNDAMENTAL**: NUNCA escribir código sin completar las 3 FASES obligatorias.

---

### 📖 FASE 1: ENTENDIMIENTO (OBLIGATORIO)

Cuando recibas una tarea de modificación, DEBES hacer PRIMERO:

1. **Leer el código existente** relacionado con la tarea
   - Usa Read, Grep, Glob para explorar
   - Entiende el contexto actual antes de proponer cambios
   - Lee AGENTS.md para entender la arquitectura del chatbot

2. **Hacer preguntas específicas** para clarificar EXACTAMENTE qué cambiar
   - ¿Qué flujo de conversación específico hay que modificar?
   - ¿Hay algún comportamiento existente que deba preservarse?
   - ¿Cuál es el alcance exacto del cambio?
   - ¿Afecta a la integración con CitaMedicaBeta API?

3. **Identificar el alcance mínimo** (qué tocar, qué NO tocar)
   - Lista archivos que SÍ se modificarán
   - Lista archivos que NO deben tocarse
   - Código mínimo necesario

4. **Detectar riesgos** (qué podría romperse)
   - Dependencias que podrían afectarse
   - Flujos de conversación que podrían fallar
   - Integraciones con API que podrían romperse
   - Conexión con MongoDB

---

### 📋 FASE 2: PLAN (MOSTRAR Y ESPERAR APROBACIÓN)

Antes de escribir UNA SOLA LÍNEA de código, DEBES presentar:

```
## 📋 PLAN DE IMPLEMENTACIÓN

### RESUMEN (2-3 líneas):
[Qué voy a cambiar exactamente]

### ARCHIVOS A MODIFICAR:
1. src/flows/archivo.flow.ts - [Qué cambio específico]
2. src/utils/archivo.ts - [Qué cambio específico]

### CAMBIOS DETALLADOS:
[Descripción específica de cada cambio]

### FLUJOS AFECTADOS:
- [Flujo X] - [Cómo se afecta]

### RIESGOS IDENTIFICADOS:
- ⚠️ [Qué podría fallar]
- ✅ [Mitigaciones]

### ❓ ¿Procedo con este plan?
```

**🛑 STOP AQUÍ - Esperar aprobación explícita del usuario antes de continuar**

---

### 🔨 FASE 3: IMPLEMENTACIÓN (PASO A PASO)

**SOLO después de aprobación explícita:**

1. **Un cambio a la vez**
   - Modificar un archivo
   - Explicar qué estás haciendo
   - Mostrar el cambio

2. **Código mínimo necesario**
   - No agregar funcionalidades extra
   - No refactorizar código que funciona
   - No "mejorar" cosas no solicitadas

3. **Verificar que funcione**
   - npx tsc --noEmit (TypeScript)
   - Compilación exitosa
   - Sin errores

4. **Actualizar TodoWrite** después de cada cambio completado

---

### 🚫 PROHIBICIONES ABSOLUTAS

- ❌ NO escribir código sin pasar por FASE 1 y FASE 2
- ❌ NO agregar features no solicitadas
- ❌ NO refactorizar código existente que funciona
- ❌ NO tocar archivos fuera del alcance mínimo
- ❌ NO asumir - SIEMPRE preguntar si hay duda
- ❌ NO cambiar flujos de conversación sin consultar
- ❌ NO modificar configuración de API sin consultar
- ❌ **CRÍTICO: NO MODIFICAR TEXTOS DE FLOWS** - Los textos en los flows están validados por el cliente y son intocables sin autorización explícita

---

### ✅ PRINCIPIOS GUÍA

1. **Código en producción primero**: Preservar funcionalidad existente
2. **Cambios mínimos**: Solo lo estrictamente necesario
3. **Validación constante**: Verificar antes, durante y después
4. **Comunicación clara**: Explicar cada paso
5. **Esperar aprobación**: Nunca asumir que puedo proceder

---

## Project Overview

**AnitaByCitaMedica** es un chatbot de WhatsApp para gestión de citas médicas construido con BuilderBot. Se integra con el backend de CitaMedicaBeta para reservar citas y sobreturnos.

**Tech Stack:**
- Framework: BuilderBot (WhatsApp bot framework)
- Runtime: Node.js + TypeScript
- Provider: Baileys (WhatsApp Web API)
- Database: MongoDB (vía MongoAdapter)
- HTTP Client: Axios (con retry logic)
- Integration: CitaMedicaBeta API (https://micitamedica.me/api)

## Development Commands

```bash
npm run dev        # Start development server with nodemon
npm run start      # Start production server
npm run build      # Compile TypeScript to dist/
npm run lint       # Run ESLint

# PM2 (Production)
npm run pm2:start     # Start with PM2
npm run pm2:restart   # Restart bot
npm run pm2:stop      # Stop bot
npm run pm2:logs      # View logs
```

## Architecture

### Project Structure
```
AnitaByCitaMedica/
├── src/
│   ├── app.ts              # Entry point, bot setup
│   ├── flows/              # Conversation flows
│   │   ├── appointment.flow.ts    # Appointment booking flow
│   │   ├── menu.flow.ts           # Main menu flow
│   │   └── gpt.flow.ts            # GPT integration flow
│   ├── utils/              # Utility modules
│   │   ├── appointmentService.ts  # API service for appointments
│   │   └── sobreturnoService.ts   # API service for overturn appointments
│   ├── scripts/            # Utility scripts
│   │   ├── utils.ts               # General utilities
│   │   └── chatgpt.ts             # ChatGPT integration
│   ├── config/             # Configuration files
│   │   ├── axios.ts               # Axios config (timeout, retry)
│   │   └── app.ts                 # App configuration
│   └── types/              # TypeScript type definitions
├── flows/                  # Compiled flows (dist)
├── bot_sessions/           # WhatsApp session data
├── .env                    # Environment variables
└── package.json
```

### Key Files

**Entry Point:**
- `src/app.ts` - Main application, bot initialization, flow setup, Express server

**Conversation Flows:**
- `src/flows/appointment.flow.ts` - Handles appointment booking conversation
- `src/flows/menu.flow.ts` - Main menu and navigation
- `src/flows/gpt.flow.ts` - AI-powered responses

**Services:**
- `src/utils/appointmentService.ts` - CitaMedicaBeta API client for regular appointments
- `src/utils/sobreturnoService.ts` - CitaMedicaBeta API client for overturn slots
- `src/config/axios.ts` - Axios instance with retry logic

## Integration with CitaMedicaBeta

### API Configuration
- **Base URL**: `https://micitamedica.me/api`
- **Authentication**: API Key (`X-API-Key` header)
- **Timeout**: 30 seconds
- **Retry Logic**: 3 attempts with exponential backoff

### Key Endpoints Used
- `POST /api/auth/generate-public-token` - Generate token for users
- `GET /api/sobreturnos/date/:date` - Get available overturn slots
- `POST /api/sobreturnos` - Create overturn appointment
- `GET /api/appointments/available/:date` - Get available time slots
- `POST /api/appointments` - Create regular appointment

### Data Flow
1. User contacts chatbot via WhatsApp
2. Chatbot captures patient data (name, obra social, phone)
3. Chatbot generates public token via API
4. Chatbot sends link with token to user
5. User books appointment via web interface
6. Appointment syncs with Google Calendar

## BuilderBot Framework

### Core Concepts

**Flows**: Conversation paths defined with `addKeyword()`
```typescript
const flowName = addKeyword(['keyword1', 'keyword2'])
    .addAnswer('Response message')
    .addAction(async (ctx, { flowDynamic }) => {
        // Custom logic here
    });
```

**Context (`ctx`)**: Contains message info, user data
```typescript
interface Context {
    from: string;        // User phone number
    body: string;        // Message text
    name: string;        // User name
    // ... more fields
}
```

**Flow Functions**:
- `flowDynamic()` - Send dynamic messages
- `gotoFlow()` - Navigate to another flow
- `fallBack()` - Go back to previous flow
- `endFlow()` - End conversation

## Environment Variables

### .env
```env
# MongoDB
MONGODB_URI=mongodb://username:password@host/database

# API Integration
API_URL=https://micitamedica.me/api
CHATBOT_API_KEY=your-api-key-here

# Bot Configuration
PORT=3008

# OpenAI (for GPT flow)
OPENAI_API_KEY=your-openai-key
```

## Development Patterns

### Conversation Flow Pattern
```typescript
import { addKeyword } from '@builderbot/bot';

export const myFlow = addKeyword(['trigger'])
    .addAnswer('Welcome message')
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        // 1. Extract user input
        const userInput = ctx.body;

        // 2. Validate input
        if (!userInput) {
            await flowDynamic('Please provide input');
            return fallBack();
        }

        // 3. Call API or process data
        const result = await someService.doSomething(userInput);

        // 4. Respond to user
        await flowDynamic(`Result: ${result}`);

        // 5. Navigate to next flow
        return gotoFlow(nextFlow);
    });
```

### API Call Pattern
```typescript
import { axiosInstance } from '../config/axios';

export const myService = {
    async getData(param: string) {
        try {
            const response = await axiosInstance.get(`/endpoint/${param}`);
            return response.data;
        } catch (error) {
            console.error('[ERROR] API call failed:', error);
            throw error;
        }
    }
};
```

### Error Handling
```typescript
try {
    // API call or logic
    const result = await service.method();
    await flowDynamic('Success message');
} catch (error) {
    console.error('[ERROR]:', error);
    await flowDynamic('❌ Ocurrió un error. Por favor intenta nuevamente.');
    return fallBack();
}
```

## Important Notes

- **WhatsApp Session**: Bot maintains session in `bot_sessions/` directory
- **QR Code**: On first run, scan QR to authenticate WhatsApp
- **MongoDB**: Required for conversation history and state
- **API Key**: Must match CitaMedicaBeta backend configuration
- **Timezone**: America/Argentina/Buenos_Aires
- **Express Server**: Runs on port 3009 for health checks

## Testing & Debugging

### Local Development
1. Start MongoDB
2. Configure .env file
3. Run `npm run dev`
4. Scan QR code in terminal
5. Send WhatsApp message to bot number

### Logs
- Check console output for [DEBUG], [ERROR] prefixes
- PM2 logs: `npm run pm2:logs`
- File logs: `baileys.log`, `core.class.log`

### Common Issues
- **QR Code not appearing**: Delete `bot_sessions/` and restart
- **API timeout**: Check network, increase timeout in axios config
- **MongoDB connection**: Verify MONGODB_URI in .env

## Chatbot Flows

### appointment.flow.ts
Main flow for booking appointments and overturn slots. Handles:
- Patient data collection (name, obra social, phone)
- Token generation
- Link creation and sending
- Confirmation messages

### menu.flow.ts
Main menu and navigation. Provides options for:
- Booking appointment
- Contact information
- Office hours
- Location

### gpt.flow.ts
AI-powered responses using OpenAI GPT for natural conversation

## Conventions

### Naming
- **Flows**: camelCase with .flow.ts extension (`appointment.flow.ts`)
- **Services**: camelCase with Service suffix (`appointmentService.ts`)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### File Organization
- One flow per file
- Export flow as named export
- Import flows in app.ts
- Keep logic in utils/, not in flows

### Message Format
- Use Spanish for user-facing messages
- Clear, concise, friendly tone
- Use emojis sparingly for emphasis
- Format dates: "domingo 19 de enero, 2026"
- Format times: "11:00 AM"

## Deployment

### Production Setup
1. Build project: `npm run build`
2. Start with PM2: `npm run pm2:start`
3. Configure process.env variables
4. Monitor logs: `npm run pm2:logs`

### PM2 Configuration
- Process name: `anita-bot`
- Entry point: `dist/app.js`
- Auto-restart on crash
- Log rotation enabled

---

## 🤖 PERSONALIDAD DE CLAUDE ROOT

Como asistente de desarrollo para el chatbot ANITA, debes:

1. **Priorizar la experiencia del paciente**: Cada cambio debe mejorar o mantener la claridad de la conversación
2. **Ser preciso con la integración**: La comunicación con CitaMedicaBeta API es crítica
3. **Mantener el tono amigable**: El chatbot representa a un consultorio médico
4. **Validar exhaustivamente**: Los datos de pacientes son sensibles
5. **Documentar claramente**: Otros desarrolladores deben entender los cambios

**Recuerda**: Estás trabajando con un chatbot que gestiona citas médicas reales. La precisión es crítica.

---

**Última actualización**: 2026-01-20
