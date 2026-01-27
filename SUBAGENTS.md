# Guía de Subagentes - AnitaByCitaMedica

Documentación detallada de la estructura y patrones del chatbot para agentes de Claude Code.

---

## 🗺️ MAPA DE NAVEGACIÓN CHATBOT

**Usa este mapa para saber DÓNDE buscar según el tipo de cambio solicitado:**

### 💬 Cambios de Flujos de Conversación / Diálogos
**Buscar en:**
- `src/flows/*.flow.ts` - Flujos de conversación (appointment, menu, gpt)

**Ejemplos:**
- "Cambiar mensaje de bienvenida" → `flows/appointment.flow.ts`
- "Agregar nueva opción al menú" → `flows/menu.flow.ts`
- "Modificar flujo de agendamiento" → `flows/appointment.flow.ts`

---

### 🔌 Cambios de Integración API / Servicios
**Buscar en:**
- `src/utils/*Service.ts` - Servicios API (appointmentService, sobreturnoService)
- `src/config/axios.ts` - Configuración HTTP

**Ejemplos:**
- "Agregar nuevo endpoint" → `utils/appointmentService.ts`
- "Cambiar timeout de API" → `config/axios.ts`
- "Modificar retry logic" → `config/axios.ts`

---

### 🛠️ Cambios de Utilidades / Scripts
**Buscar en:**
- `src/scripts/*.ts` - Scripts de utilidades (utils, chatgpt)

**Ejemplos:**
- "Agregar función auxiliar" → `scripts/utils.ts`
- "Modificar integración ChatGPT" → `scripts/chatgpt.ts`

---

### ⚙️ Cambios de Configuración / Setup
**Buscar en:**
- `src/app.ts` - Entry point y configuración del bot
- `src/config/*.ts` - Archivos de configuración
- `.env` - Variables de entorno

**Ejemplos:**
- "Cambiar puerto del bot" → `.env` y `config/app.ts`
- "Modificar configuración de MongoDB" → `app.ts`
- "Agregar nuevo provider" → `app.ts`

---

### 📝 Cambios de Tipos / Interfaces
**Buscar en:**
- `src/types/*.ts` - Definiciones TypeScript

**Ejemplos:**
- "Agregar campo a interface Patient" → `types/`
- "Cambiar tipo de variable" → `types/`

---

## 🎯 SKILLS CHATBOT

### SKILL 1: analisis-chatbot
**Cuándo usar:** Antes de cualquier modificación de código del chatbot.

**Pasos:**
1. **Identificar tipo de cambio** usando el Mapa de Navegación arriba
2. **Leer archivos relacionados**:
   - Si es flujo → Leer flow completo Y flows relacionados
   - Si es API → Leer servicio completo Y config/axios.ts
   - Si es util → Leer script completo Y dónde se llama
   - Si es config → Leer app.ts Y .env
3. **Buscar dependencias**:
   - ¿Qué flows usan este servicio?
   - ¿Qué mensajes se envían al usuario?
   - ¿Qué endpoints de API se llaman?
4. **Verificar integración**:
   - ¿Cómo afecta a CitaMedicaBeta API?
   - ¿Qué datos se envían/reciben?
5. **Hacer preguntas al usuario**:
   - ¿Exactamente qué mensaje cambiar?
   - ¿Qué comportamiento debe preservarse?
   - ¿Afecta a citas, sobreturnos, o ambos?
   - ¿El cambio requiere actualizar el backend?

---

### SKILL 2: plan-chatbot
**Cuándo usar:** Después de completar analisis-chatbot y antes de codear.

**Formato del plan:**
```
## 📋 PLAN CHATBOT

### RESUMEN:
[Descripción en 2-3 líneas del cambio]

### ARCHIVOS A MODIFICAR:
- src/flows/[archivo].flow.ts - [Cambio específico]
- src/utils/[archivo].ts - [Cambio específico]

### CAMBIOS DETALLADOS:

**Archivo 1: [nombre]**
- Línea X: [Qué cambiar]
- Keyword Y: [Qué agregar]
- Mensaje Z: [Nuevo texto]

**Archivo 2: [nombre]**
- Función: [Qué modificar]
- Endpoint: [Nueva llamada API]

### FLUJOS AFECTADOS:
- [Flujo X] - [Cómo se afecta]
- [Flujo Y] - [Navegación modificada]

### MENSAJES AL USUARIO:
- [Mensaje actual] → [Mensaje nuevo]

### API CALLS AFECTADAS:
- [Endpoint] - [Qué cambia]

### RIESGOS:
- ⚠️ [Qué podría romperse]
- ⚠️ [Flujos que podrían fallar]
- ✅ Mitigación: [Cómo evitarlo]

### VALIDACIÓN:
- [ ] Compilación TypeScript: npx tsc --noEmit
- [ ] Verificar imports
- [ ] Verificar tipos
- [ ] Probar flow manualmente

### ❓ ¿Procedo?
```

**🛑 ESPERAR APROBACIÓN antes de continuar**

---

### SKILL 3: implementacion-chatbot
**Cuándo usar:** Solo después de aprobación del plan.

**Pasos:**
1. **Modificar un archivo a la vez**:
   - Usar Edit tool
   - Explicar qué estás haciendo
   - Mostrar el fragmento cambiado

2. **Orden de modificación**:
   - Primero: `types/` (si cambia interface)
   - Segundo: `utils/` o `scripts/` (servicios/utilidades)
   - Tercero: `config/` (configuración)
   - Cuarto: `flows/` (flujos de conversación)
   - Quinto: `app.ts` (entry point)

3. **Verificar después de cada cambio**:
   ```bash
   npx tsc --noEmit
   ```

4. **Actualizar TodoWrite** marcando tarea como completada

5. **Si hay error**:
   - Mostrar el error
   - Analizar causa
   - Proponer solución
   - Esperar aprobación para arreglar

6. **Código mínimo**:
   - NO agregar features extra
   - NO cambiar mensajes no relacionados
   - NO modificar flows no afectados
   - Solo el cambio solicitado

---

### ⚠️ REGLAS ESPECÍFICAS CHATBOT

**BuilderBot / Flows:**
- Respetar estructura de flows existente (addKeyword, addAnswer, addAction)
- No cambiar keywords sin consultar (afecta triggers del bot)
- Mantener tono amigable en mensajes
- Usar emojis de forma consistente con flows existentes

**TypeScript:**
- Nunca usar `any`
- Siempre tipar correctamente
- Verificar con `npx tsc --noEmit` antes de marcar como completado

**Mensajes al Usuario:**
- Usar español claro y amigable
- Evitar tecnicismos innecesarios
- Ser conciso (WhatsApp es móvil)
- Mantener tono profesional pero cálido

**Integración API:**
- Respetar estructura de respuesta del backend
- Mantener manejo de errores existente (try-catch con mensajes amigables)
- No cambiar configuración de axios sin consultar
- Verificar que retry logic funcione

**MongoDB:**
- No cambiar configuración de base de datos sin consultar
- Respetar formato de datos almacenados

---

## Stack Tecnológico

- **Framework**: BuilderBot
- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **WhatsApp Provider**: Baileys
- **Database**: MongoDB (MongoAdapter)
- **HTTP Client**: Axios (con retry logic)
- **AI**: OpenAI GPT (opcional, para gpt.flow)
- **Process Manager**: PM2 (producción)

## Estructura de Carpetas

```
src/
├── app.ts                 # Entry point del bot
├── flows/                 # Flujos de conversación
│   ├── appointment.flow.ts    # Agendamiento (PRINCIPAL)
│   ├── menu.flow.ts           # Menú de opciones
│   └── gpt.flow.ts            # Asistente IA
│
├── utils/                 # Servicios y utilidades
│   ├── appointmentService.ts  # API de citas regulares
│   └── sobreturnoService.ts   # API de sobreturnos
│
├── scripts/               # Scripts auxiliares
│   ├── utils.ts               # Utilidades generales
│   └── chatgpt.ts             # Integración ChatGPT
│
├── config/                # Configuración
│   ├── axios.ts               # Axios config (timeout, retry)
│   └── app.ts                 # App configuration
│
└── types/                 # TypeScript types
```

## Flujos de Conversación

### appointment.flow.ts (PRINCIPAL)

**Propósito**: Gestiona el proceso completo de agendamiento de citas y sobreturnos.

**Keywords que activan**:
```typescript
['hola', 'buenos dias', 'buenas tardes', 'buenas noches',
 'ola', 'hola!', 'hey',
 'quiero un turno', 'necesito una cita',
 'agendar', 'reservar']
```

**Flujo de conversación**:
```
1. SALUDO INICIAL
   Bot: "¡Hola! Soy ANITA, el asistente virtual del consultorio..."

2. CAPTURA NOMBRE
   Bot: "¿Podrías decirme tu nombre completo?"
   Usuario: [Nombre]
   Validación: Mínimo 3 caracteres, solo letras

3. CAPTURA OBRA SOCIAL
   Bot: "¿Qué obra social tenés?"
   Usuario: [Obra Social]
   Validación: No vacío

4. CAPTURA TELÉFONO
   Bot: "Por favor, confirmá tu número de teléfono"
   Usuario: [Teléfono] (opcional, usa ctx.from si no responde)
   Validación: Formato de teléfono válido

5. GENERACIÓN TOKEN
   API Call: POST /api/auth/generate-public-token
   Almacena: token en variable temporal

6. ENVÍO LINK
   Bot envía: "📋 Aquí está tu link personalizado..."
   Link: https://micitamedica.me/seleccionar-sobreturno?token=XXX

7. CONFIRMACIÓN
   Bot: "✅ ¡Listo! Ya podés seleccionar tu turno..."

8. FIN
   Bot: "Cualquier consulta, escribime nuevamente."
```

**Funciones principales**:
```typescript
// Generación de token público
const generatePublicToken = async (): Promise<string> => {
  const response = await axiosInstance.post('/auth/generate-public-token');
  return response.data.token;
};

// Validación de nombre
const validateName = (name: string): boolean => {
  return name.length >= 3 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name);
};

// Validación de teléfono
const validatePhone = (phone: string): boolean => {
  return /^\+?[0-9]{10,15}$/.test(phone);
};
```

**Estados del flujo**:
```typescript
interface FlowState {
  name: string | null;
  obraSocial: string | null;
  phone: string | null;
  token: string | null;
}
```

### menu.flow.ts

**Propósito**: Proporciona información del consultorio.

**Keywords**: `['menu', 'menú', 'opciones', 'ayuda', 'info']`

**Opciones**:
1. 📞 Información de contacto
2. 🕐 Horarios de atención
3. 📍 Ubicación del consultorio
4. 💳 Obras sociales aceptadas
5. 🔙 Volver al inicio

**Pattern**:
```typescript
export const menuFlow = addKeyword(['menu', 'menú'])
    .addAnswer('📋 *MENÚ PRINCIPAL*\n\n' +
        '1. Información de contacto\n' +
        '2. Horarios\n' +
        '3. Ubicación\n' +
        '4. Obras sociales\n\n' +
        'Escribí el número de la opción'
    )
    .addAction(async (ctx, { flowDynamic, gotoFlow, fallBack }) => {
        const option = ctx.body.trim();

        switch(option) {
            case '1':
                await flowDynamic('📞 *CONTACTO*\n...');
                break;
            case '2':
                await flowDynamic('🕐 *HORARIOS*\n...');
                break;
            // ...
            default:
                await flowDynamic('Opción inválida. Elegí 1, 2, 3 o 4');
                return fallBack();
        }
    });
```

### gpt.flow.ts

**Propósito**: Respuestas inteligentes con OpenAI GPT.

**Keywords**: `['gpt', 'pregunta', 'consulta']`

**Configuración GPT**:
```typescript
const systemPrompt = `Eres ANITA, asistente virtual del consultorio médico
Dr. Daniel Kulinka. Respondé de forma amigable y profesional. Si te preguntan
por turnos, derivá al flujo de agendamiento.`;

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: ctx.body }
  ],
  temperature: 0.7,
  max_tokens: 150
});
```

## Servicios API

### appointmentService.ts

**Estructura**:
```typescript
import { axiosInstance } from '../config/axios';

const appointmentService = {
  // Obtener horarios disponibles
  async getAvailableTimes(date: string): Promise<string[]> {
    try {
      const response = await axiosInstance.get(
        `/appointments/available/${date}`
      );
      return response.data.availableTimes;
    } catch (error) {
      console.error('[ERROR] getAvailableTimes:', error);
      throw error;
    }
  },

  // Crear cita
  async createAppointment(data: AppointmentData): Promise<Appointment> {
    const response = await axiosInstance.post('/appointments', data);
    return response.data;
  },

  // Verificar disponibilidad
  async checkAvailability(date: string, time: string): Promise<boolean> {
    const response = await axiosInstance.get('/appointments/available-times', {
      params: { date, time }
    });
    return response.data.available;
  }
};

export default appointmentService;
```

### sobreturnoService.ts

**Estructura**:
```typescript
const sobreturnoService = {
  // Obtener sobreturnos disponibles por fecha
  async getSobreturnosByDate(date: string): Promise<SobreturnoResponse> {
    const response = await axiosInstance.get(`/sobreturnos/date/${date}`);
    return response.data;
  },

  // Crear sobreturno
  async createSobreturno(data: SobreturnoData): Promise<Sobreturno> {
    const response = await axiosInstance.post('/sobreturnos', data);
    return response.data;
  },

  // Validar disponibilidad de sobreturno específico
  async validateSobreturno(date: string, numero: number): Promise<boolean> {
    const response = await axiosInstance.get('/sobreturnos/validate', {
      params: { date, sobreturnoNumber: numero }
    });
    return response.data.available;
  }
};

export default sobreturnoService;
```

**Response types**:
```typescript
interface SobreturnoResponse {
  success: boolean;
  data: {
    disponibles: Array<{
      numero: number;
      horario: string;
      turno: 'mañana' | 'tarde';
    }>;
    totalDisponibles: number;
    fecha: string;
  };
}
```

## Configuración de Axios

### config/axios.ts

**Configuración completa**:
```typescript
import axios from 'axios';

const API_URL = process.env.API_URL || 'https://micitamedica.me/api';
const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY || '';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': CHATBOT_API_KEY
  }
});

// Interceptor de request
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor de response con retry logic
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}`);
    return response;
  },
  async (error) => {
    const config = error.config;

    // Retry logic
    if (!config || !config.retry) {
      config.retry = 0;
    }

    if (config.retry >= 3) {
      console.error('[API] Max retries reached');
      return Promise.reject(error);
    }

    // Condiciones para retry
    const shouldRetry =
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      (error.response && error.response.status >= 500) ||
      (error.response && error.response.status === 408) ||
      (error.response && error.response.status === 429);

    if (shouldRetry) {
      config.retry += 1;
      const delayMs = Math.pow(2, config.retry) * 1000; // Exponential backoff

      console.log(`[API] Retry ${config.retry}/3 after ${delayMs}ms`);

      await new Promise(resolve => setTimeout(resolve, delayMs));
      return axiosInstance(config);
    }

    return Promise.reject(error);
  }
);

// Función auxiliar para retry manual
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delayMs = Math.pow(2, i + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
};
```

## Tipos TypeScript

### Tipos principales

```typescript
// Paciente (datos capturados en chat)
interface Patient {
  name: string;
  phone: string;
  obrasocial: string;
}

// Datos para crear cita regular
interface AppointmentData {
  clientName: string;
  socialWork: string;
  phone: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  email?: string;
  isSobreturno: false;
}

// Datos para crear sobreturno
interface SobreturnoData {
  clientName: string;
  socialWork: string;
  phone: string;
  date: string;
  sobreturnoNumber: number; // 1-10
  isSobreturno: true;
}

// Cita (respuesta de API)
interface Appointment {
  _id: string;
  clientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  socialWork: string;
  phone: string;
  email?: string;
  attended: boolean;
  isPaid: boolean;
  googleEventId?: string;
  isSobreturno: boolean;
}

// Respuesta estándar de API
interface APIResponse {
  success: boolean;
  data: any;
  message?: string;
}

// Context de BuilderBot
interface BotContext {
  from: string;      // Número de teléfono del usuario
  body: string;      // Texto del mensaje
  name: string;      // Nombre del contacto
  // ... más propiedades
}
```

## Patrones de Desarrollo

### Pattern 1: Captura de Datos de Usuario

```typescript
const captureNameFlow = addKeyword(['start'])
    .addAnswer('¿Cuál es tu nombre?')
    .addAction(async (ctx, { flowDynamic, fallBack, gotoFlow, state }) => {
        const name = ctx.body.trim();

        // Validar
        if (name.length < 3) {
            await flowDynamic('❌ El nombre debe tener al menos 3 caracteres');
            return fallBack(); // Volver a preguntar
        }

        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
            await flowDynamic('❌ El nombre solo debe contener letras');
            return fallBack();
        }

        // Guardar en state
        await state.update({ name });

        // Continuar al siguiente flow
        return gotoFlow(nextFlow);
    });
```

### Pattern 2: Llamada a API con Manejo de Errores

```typescript
.addAction(async (ctx, { flowDynamic, fallBack }) => {
    try {
        // Llamada a API
        const result = await sobreturnoService.getSobreturnosByDate('2026-01-20');

        // Verificar respuesta
        if (!result.success || result.data.disponibles.length === 0) {
            await flowDynamic('❌ No hay sobreturnos disponibles para esa fecha');
            return fallBack();
        }

        // Procesar resultado
        await flowDynamic(`✅ Encontré ${result.data.totalDisponibles} sobreturnos disponibles`);

    } catch (error) {
        console.error('[ERROR] API call failed:', error);
        await flowDynamic('❌ Ocurrió un error. Por favor intenta nuevamente en unos minutos.');
        return fallBack();
    }
});
```

### Pattern 3: Navegación entre Flows

```typescript
const mainFlow = addKeyword(['hola'])
    .addAnswer('Bienvenido! ¿Qué deseas hacer?\n1. Agendar turno\n2. Ver menú')
    .addAction(async (ctx, { gotoFlow }) => {
        const option = ctx.body.trim();

        if (option === '1') {
            return gotoFlow(appointmentFlow);
        } else if (option === '2') {
            return gotoFlow(menuFlow);
        } else {
            await flowDynamic('Opción inválida');
            return fallBack();
        }
    });
```

### Pattern 4: Uso de State

```typescript
// Guardar en state
await state.update({
    patientName: 'Juan Pérez',
    obraSocial: 'OSDE'
});

// Leer del state
const patientData = state.getMyState();
console.log(patientData.patientName); // 'Juan Pérez'

// Limpiar state
await state.clear();
```

## Mensajes al Usuario

### Formato de Mensajes

```typescript
// ✅ BUENO: Claro, conciso, amigable
await flowDynamic('¡Hola! Soy ANITA 👋\nEstoy aquí para ayudarte a agendar tu turno.');

// ❌ MALO: Demasiado largo, confuso
await flowDynamic('Hola, soy el asistente virtual del consultorio del Dr. Daniel Kulinka y estoy programado para ayudarte en el proceso de agendamiento de turnos médicos a través de esta plataforma de mensajería instantánea...');

// ✅ BUENO: Usa emojis con moderación
await flowDynamic('✅ ¡Perfecto! Tu turno fue agendado.');

// ✅ BUENO: Mensajes de error claros
await flowDynamic('❌ El nombre debe tener al menos 3 caracteres. Por favor, intentá nuevamente.');

// ✅ BUENO: Instrucciones claras
await flowDynamic('Por favor, enviame tu nombre completo.\n\nEjemplo: Juan Pérez');
```

### Tono de Voz

- **Amigable pero profesional**: Es un consultorio médico
- **Trato de "vos"**: Usado en Argentina
- **Conciso**: Mensajes cortos para WhatsApp
- **Empático**: Entender que el usuario puede estar enfermo o preocupado

## Debugging

### Logs Útiles

```typescript
// En flows
console.log('[DEBUG] User message:', ctx.body);
console.log('[DEBUG] User phone:', ctx.from);
console.log('[DEBUG] Current state:', state.getMyState());

// En services
console.log('[API] Calling endpoint:', endpoint);
console.log('[API] Request data:', data);
console.log('[API] Response:', response.data);

// Errores
console.error('[ERROR] Flow failed:', error.message);
console.error('[ERROR] Stack:', error.stack);
```

### Testing Manual

1. Iniciar bot en dev: `npm run dev`
2. Escanear QR en WhatsApp
3. Enviar mensaje de prueba
4. Verificar logs en consola
5. Verificar respuesta del bot

## Comandos de Desarrollo

```bash
# Desarrollo
npm run dev           # Hot reload con nodemon
npm run start         # Producción sin PM2
npm run build         # Compilar TypeScript

# Linting
npm run lint          # Verificar código

# TypeScript
npx tsc --noEmit      # Verificar tipos sin compilar

# PM2
npm run pm2:start     # Iniciar con PM2
npm run pm2:restart   # Reiniciar
npm run pm2:logs      # Ver logs
npm run pm2:stop      # Detener
```

## Archivos Clave de Referencia

1. **src/app.ts** - Entry point y setup del bot
2. **src/flows/appointment.flow.ts** - Flujo principal
3. **src/utils/appointmentService.ts** - Cliente API citas
4. **src/utils/sobreturnoService.ts** - Cliente API sobreturnos
5. **src/config/axios.ts** - Configuración HTTP

---

**Última actualización**: 2026-01-20
