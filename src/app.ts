import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot'
import { MongoAdapter as Database } from '@builderbot/database-mongo'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import dotenv from 'dotenv';
dotenv.config();

// Manejadores de errores globales
process.on('uncaughtException', (error) => {
    console.error('\n❌ ❌ ❌ UNCAUGHT EXCEPTION ❌ ❌ ❌');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason: any, promise) => {
    console.error('\n❌ ❌ ❌ UNHANDLED REJECTION ❌ ❌ ❌');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
});

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import { axiosInstance, retryRequest } from './config/axios';
import { getFallbackSlots } from './utils/fallbackData';
import { APP_CONFIG } from './config/app';
import appointmentService from './utils/appointmentService';
import sobreturnoService from './utils/sobreturnoService';

interface APIResponse {
    success: boolean;
    data: any;
    message?: string;
}

interface APIResponseWrapper {
    data?: APIResponse;
    error?: boolean;
    message?: string;
}

const API_URL = 'https://micitamedica.me/api';
const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY || '';
console.log('API URL configuradaa:', API_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json()); // Agregamos middleware para parsear JSON
const pdfFolderPath = join(__dirname, 'pdfs');
app.use('/pdfs', express.static(pdfFolderPath));

const PORT = APP_CONFIG.PORT;
const expressPort = 3009; // Puerto diferente para Express

const isActive = async (ctx, ctxFn) => {
    // Implementa la lógica de isActive aquí
    return true;
};

const isConvActive = async (from, ctxFn) => {
    // Implementa la lógica de isConvActive aquí
    return true;
};



interface Patient {
    name: string;
    phone: string;
    obrasocial: string;
}

interface AppointmentTime {
    displayTime: string;
}

interface AppointmentDetails {
    displayDate: string;
    start: AppointmentTime;
    end: AppointmentTime;
    patient: Patient;
    summary: string;
}

interface AppointmentData {
    clientName: string;
    socialWork: string;
    phone: string;
    date: string;
    time: string;
    email?: string;
    isSobreturno?: boolean;
}

interface AppointmentResponse {
    success: boolean;
    data: {
        _id: string;
        clientName: string;
        socialWork: string;
        phone: string;
        date: string;
        time: string;
        status: string;
        email?: string;
    };
}

interface TimeSlot {
    displayTime: string;
    time: string;
    status: 'available' | 'unavailable';
}

interface AvailableSlots {
    morning: TimeSlot[];
    afternoon: TimeSlot[];
}

interface APIResponse {
    success: boolean;
    data: any;
    message?: string;
}

interface APIResponseWrapper {
    data?: APIResponse;
}

function formatearFechaEspanol(fecha: string): string {
    const timeZone = 'America/Argentina/Buenos_Aires';
    const date = fecha.includes('T') ?
        toZonedTime(new Date(fecha), timeZone) :
        toZonedTime(new Date(fecha + 'T00:00:00'), timeZone);

    console.log('8. Formateando fechaa:', date);
    const nombreDia = format(date, 'EEEE', { locale: es });
    const diaDelMes = format(date, 'dd');
    console.log('7. Día del mes:', diaDelMes);
    const nombreMes = format(date, 'MMMM', { locale: es });
    const año = format(date, 'yyyy');

    return `${nombreDia} ${diaDelMes} de ${nombreMes} de ${año}`;
}

async function fetchAvailableSlots(date: Date): Promise<APIResponseWrapper> {
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log('=== DEBUG FETCH SLOTS ===');
    console.log('9. Consultando slots disponibles para:', formattedDate);

    try {
        const result = await retryRequest(async () => {
            const response = await axiosInstance.get<APIResponse>(`/appointments/available/${formattedDate}`);
            console.log('Respuesta del servidor:', response.data);
            return { data: response.data };
        });

        if (result.error === 'timeout' || result.error === true) {
            console.log('Usando sistema de respaldo debido a problemas de conexión');
            const fallbackData = getFallbackSlots(formattedDate);
            return {
                data: fallbackData,
                message: 'Estamos experimentando problemas de conexión. Mostrando horarios disponibles del sistema de respaldo.'
            };
        }

        return result;
    } catch (error) {
        console.error('=== DEBUG ERROR ===');
        console.error('Error al obtener slots disponibles:', error);
        if (axios.isAxiosError(error)) {
            console.error('Detalles del error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url
            });
        }

        console.log('Usando sistema de respaldo debido a error en la petición');
        const fallbackData = getFallbackSlots(formattedDate);
        return {
            data: fallbackData,
            message: 'Estamos experimentando problemas técnicos. Mostrando horarios disponibles del sistema de respaldo.'
        };
    }
}

// Funciones auxiliares para citas y sobreturnos
async function getReservedAppointments(date: string): Promise<string[]> {
    return appointmentService.getReservedSlots(date);
}

async function createAppointment(appointmentData: AppointmentData): Promise<APIResponseWrapper> {
    return appointmentService.createAppointment(appointmentData);
}

async function generarOpcionesSobreturno(): Promise<string> {
    let bookingUrl = 'https://micitamedica.me/seleccionar-sobreturno';
    try {
        const tokenResponse = await axiosInstance.post('/tokens/generate-public-token', {}, {
            headers: { 'X-API-Key': CHATBOT_API_KEY }
        });
        if (tokenResponse.data.success && tokenResponse.data.data.token) {
            bookingUrl = `https://micitamedica.me/seleccionar-sobreturno?token=${tokenResponse.data.data.token}`;
        }
    } catch (e) {
        // Si falla la generación del token, usar URL estática
    }
    return `\n\n📱 *Opciones para solicitar un sobreturno:*\n\n` +
           `1️⃣ *Por teléfono:*\n   📞 Llamá al: *3735604949*\n\n` +
           `2️⃣ *Por la web:*\n   🌐 ${bookingUrl}`;
}


//Flujo de sobreturnos - SOLO se activa con la palabra "sobreturnos"
export const sobreTurnosTemporario = addKeyword(['sobreturnos', 'sobreturno', 'Sobreturnos', 'Sobreturno'])
    .addAction(async (ctx, { flowDynamic }) => {
        try {
            const timeZone = 'America/Argentina/Buenos_Aires';
            const now = new Date();
            const localDate = toZonedTime(now, timeZone);

            const currentHour = parseInt(format(localDate, 'HH'), 10);
            const currentMinute = parseInt(format(localDate, 'mm'), 10);

            // Calcular próximo día hábil (misma lógica que welcomeFlow)
            const getNextWorkingDay = (date: Date): Date => {
                const nextDate = new Date(date);
                nextDate.setHours(0, 0, 0, 0);
                if (currentHour > 20 || (currentHour === 20 && currentMinute >= 30)) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                return nextDate;
            };

            const appointmentDate = getNextWorkingDay(localDate);
            const formattedDate = format(appointmentDate, 'yyyy-MM-dd');

            console.log('[SOBRETURNOS] Consultando sobreturnos para:', formattedDate);

            // Consultar sobreturnos disponibles para el próximo día hábil
            const sobreturnosResponse = await fetch(`${API_URL}/sobreturnos/date/${formattedDate}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': CHATBOT_API_KEY
                }
            });

            const sobreturnosData = await sobreturnosResponse.json();
            const disponibles = sobreturnosData.success ? sobreturnosData.data.disponibles.length : 0;

            // Generar token público para la web
            let bookingUrl = 'https://micitamedica.me/agendar-turno';
            try {
                const tokenResponse = await axiosInstance.post('/tokens/generate-public-token', {}, {
                    headers: {
                        'X-API-Key': CHATBOT_API_KEY
                    }
                });

                if (tokenResponse.data.success && tokenResponse.data.data.token) {
                    const token = tokenResponse.data.data.token;
                    bookingUrl = `https://micitamedica.me/reservar-turno?token=${token}`;
                    console.log('[SOBRETURNOS] Token generado para URL:', bookingUrl);
                }
            } catch (tokenError) {
                console.error('[SOBRETURNOS] Error al generar token:', tokenError);
            }

            let message = `🏥 *SOLICITUD DE SOBRETURNOS*\n`;
            message += `¡Gracias por comunicarte con nosotros!\n\n`;

            if (disponibles > 0) {
                message += `✅ *Hay ${disponibles} sobreturnos disponibles*\n`;
                message += `📆 *Fecha:* ${formatearFechaEspanol(formattedDate)}\n\n`;
            } else {
                message += `⚠️ *No hay sobreturnos disponibles para el próximo día hábil*\n\n`;
            }

            message += `📱 *Opciones para solicitar un sobreturno:*\n\n`;
            message += `1️⃣ *Por teléfono:*\n`;
            message += `   📞 Llamá al: *3735604949*\n\n`;
            message += `2️⃣ *Por la web:*\n`;
            message += `   🌐 ${bookingUrl}\n\n`;
            message += `💡 *El chatbot también puede ayudarte* - Si no hay turnos normales disponibles, automáticamente te ofrecerá los sobreturnos.`;

            await flowDynamic(message);

        } catch (error) {
            console.error('[SOBRETURNOS ERROR]:', error);
            await flowDynamic(
                `🏥 *SOLICITUD DE SOBRETURNOS*\n` +
                `¡Gracias por comunicarte con nosotros!\n\n` +
                `📱 *Opciones para solicitar un sobreturno:*\n\n` +
                `1️⃣ *Por teléfono:*\n` +
                `   📞 Llamá al: *3735604949*\n\n` +
                `2️⃣ *Por la web:*\n` +
                `   🌐 https://micitamedica.me/agendar-turno`
            );
        }
    })


//Flujo de sobreturnos - SOLO se activa con la palabra "sobreturnos"
export const bookSobreturnoFlow = addKeyword(['sobreturnos', 'sobreturno', 'Sobreturnos', 'Sobreturno'])
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        // Check de disponibilidad antes de ofrecer sobreturnos
        try {
            const timeZone = 'America/Argentina/Buenos_Aires';
            const now = new Date();
            const localDate = toZonedTime(now, timeZone);
            const currentHour = parseInt(format(localDate, 'HH'), 10);
            const currentMinute = parseInt(format(localDate, 'mm'), 10);
            const getNextWD = (date: Date): Date => {
                const nd = new Date(date);
                nd.setHours(0, 0, 0, 0);
                if (currentHour > 20 || (currentHour === 20 && currentMinute >= 30)) nd.setDate(nd.getDate() + 1);
                while (nd.getDay() === 0 || nd.getDay() === 6) nd.setDate(nd.getDate() + 1);
                return nd;
            };
            const appointmentDate = getNextWD(localDate);
            const formattedDate = format(appointmentDate, 'yyyy-MM-dd');

            const unavailRes = await fetch(`${API_URL}/unavailability?date=${formattedDate}`, {
                headers: { 'Content-Type': 'application/json', 'X-API-Key': CHATBOT_API_KEY }
            });
            if (unavailRes.ok) {
                const unavailData = await unavailRes.json();
                if (unavailData.success && unavailData.data.length > 0) {
                    const block = unavailData.data[0];
                    const getFollowingWD = (date: Date): Date => {
                        const nd = new Date(date);
                        nd.setDate(nd.getDate() + 1);
                        nd.setHours(0, 0, 0, 0);
                        while (nd.getDay() === 0 || nd.getDay() === 6) nd.setDate(nd.getDate() + 1);
                        return nd;
                    };
                    const nextDay = getFollowingWD(appointmentDate);
                    const periodStr = block.period === 'morning' ? 'la mañana' : block.period === 'afternoon' ? 'la tarde' : 'este día';
                    await flowDynamic(
                        `⚠️ *El Dr. Kulinka no atiende ${periodStr} del ${formatearFechaEspanol(formattedDate)}.*\n\n` +
                        `📅 *Próximo día disponible:* ${formatearFechaEspanol(format(nextDay, 'yyyy-MM-dd'))}\n\n` +
                        `📞 Para consultar llamá al *3735604949*`
                    );
                    return gotoFlow(goodbyeFlow);
                }
            }
        } catch (e) {
            console.log('[UNAVAILABILITY] Error en sobreturno check (fail-safe)');
        }
    })
    .addAnswer(
        '🏥 *SOLICITUD DE SOBRETURNOS*\n\n' +
        'Has solicitado un *sobreturno*. Para continuar, necesito algunos datos.\n\n' +
        'Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow }) => {
            // Check cancelar global
            if (ctx.body.trim().toLowerCase() === 'cancelar') {
                await state.clear();
                await flowDynamic('❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!\n📞 *3735604949*');
                return gotoFlow(goodbyeFlow);
            }
            console.log('[SOBRETURNO] Paso 1: Nombre recibido:', ctx.body);
            const name = ctx.body.trim();

            // Validar que el nombre no esté vacío
            if (!name || name.length < 2) {
                await state.update({ invalidName: true });
                return;
            }

            await state.update({ clientName: name, invalidName: false });
        }
    )
    .addAnswer(
        '*Perfecto!* Ahora selecciona tu *OBRA SOCIAL* de la siguiente lista:\n\n' +
        '1️⃣ INSSSEP\n' +
        '2️⃣ Swiss Medical\n' +
        '3️⃣ OSDE\n' +
        '4️⃣ Galeno\n' +
        '5️⃣ CONSULTA PARTICULAR\n' +
        '6️⃣ Otras Obras Sociales\n\n' +
        '_Responde con el número correspondiente (1, 2, 3, 4, 5 o 6)_',
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow }) => {
            // Check cancelar global
            if (ctx.body.trim().toLowerCase() === 'cancelar') {
                await state.clear();
                await flowDynamic('❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!\n📞 *3735604949*');
                return gotoFlow(goodbyeFlow);
            }
            console.log('[SOBRETURNO] Paso 2: Obra social recibida:', ctx.body);

            // Verificar si el nombre anterior fue inválido
            const invalidName = state.get('invalidName');
            if (invalidName) {
                await flowDynamic('❌ El nombre anterior no es válido. Por favor, ingresa tu nombre completo:');
                await state.update({ invalidName: false });
                return;
            }

            const socialWorkOption = ctx.body.trim();
            const socialWorks = {
                '1': 'INSSSEP',
                '2': 'Swiss Medical',
                '3': 'OSDE',
                '4': 'Galeno',
                '5': 'CONSULTA PARTICULAR',
                '6': 'Otras Obras Sociales'
            };

            const socialWork = socialWorks[socialWorkOption];

            if (!socialWork) {
                await flowDynamic('❌ Opción inválida. Por favor, selecciona un número del 1 al 6.');
                return;
            }

            await state.update({ socialWork });
        }
    )
    .addAnswer(
        '🔍 *Perfecto!* Ahora voy a buscar los sobreturnos disponibles para hoy...',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                console.log('[SOBRETURNO] Paso 3: Mostrando ítems de sobreturno...');
                const timeZone = APP_CONFIG.TIMEZONE;
                const now = new Date();
                const localChatDate = toZonedTime(now, timeZone);

                const getNextWorkingDay = (date: Date): Date => {
                    const nextDate = new Date(date);
                    nextDate.setHours(0, 0, 0, 0);
                    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
                        nextDate.setDate(nextDate.getDate() + 1);
                    }
                    return nextDate;
                };

                const appointmentDate = getNextWorkingDay(localChatDate);
                const formattedDate = format(appointmentDate, 'yyyy-MM-dd');
                const fechaFormateada = formatearFechaEspanol(formattedDate);

                // Sistema de recuperación de datos con reintentos
                console.log('[SOBRETURNO FLOW] Iniciando sistema de consulta robusta...');

                let reservados = [];
                const retryCount = 0;
                const maxRetries = 3;

                // Obtener estado actual de sobreturnos
                try {
                    console.log('[SOBRETURNO FLOW] Consultando estado de sobreturnos...');

                    // Obtener directamente del servicio sin caché
                    const response = await sobreturnoService.getSobreturnosStatus(formattedDate);

                    if (response && response.data) {
                        reservados = response.data.reservados || [];
                        console.log('[SOBRETURNO FLOW] Estado obtenido:', {
                            total: response.data.total,
                            reservados: reservados.length,
                            disponibles: response.data.disponibles
                        });
                    } else {
                        console.log('[SOBRETURNO FLOW] No hay datos de sobreturnos, asumiendo todos disponibles');
                        reservados = [];
                    }
                } catch (error) {
                    console.error('[SOBRETURNO FLOW] Error al obtener estado:', error);
                    reservados = [];
                }

                // Convertir array de números ocupados a Set para búsqueda eficiente
                const ocupadosSet = new Set(reservados.map(s => s.sobreturnoNumber));
                console.log('[SOBRETURNO FLOW] Números ocupados:', Array.from(ocupadosSet));

                // Forzar verificación de disponibilidad real usando la nueva ruta
                const disponiblesResponse = await sobreturnoService.getAvailableSobreturnos(formattedDate);
                console.log('[SOBRETURNO FLOW] Respuesta de disponibles:', disponiblesResponse);

                // Lógica: Si todos los sobreturnos de la mañana están ocupados, mostrar solo los de la tarde
                const disponiblesManiana = [];
                const disponiblesTarde = [];

                // Sistema de verificación de disponibilidad con validación cruzada
                console.log('[SOBRETURNO FLOW] Iniciando verificación robusta de disponibilidad...');

                const numerosReservados = ocupadosSet;
                console.log('[SOBRETURNO FLOW] Números ya reservados:', Array.from(numerosReservados));

                const verificarDisponibilidad = async (numero: number): Promise<boolean> => {
                    try {
                        console.log(`[SOBRETURNO FLOW] Verificando disponibilidad para número ${numero}...`);

                        // 1. Verificar si está en la lista de ocupados
                        if (ocupadosSet.has(numero)) {
                            console.log(`[SOBRETURNO FLOW] Número ${numero} ocupado localmente`);
                            return false;
                        }

                        // 2. Verificar disponibilidad en el servicio usando la nueva ruta
                        try {
                            // Primero intentamos con el endpoint específico por número
                            const validateResponse = await fetch(`${API_URL}/sobreturnos/validate/${numero}`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': CHATBOT_API_KEY
                                }
                            });

                            if (validateResponse.ok) {
                                const data = await validateResponse.json();
                                console.log(`[SOBRETURNO FLOW] Respuesta de validación para ${numero}:`, data);
                                return data.available === true;
                            }

                            // Si falla, intentamos con el endpoint tradicional
                            const fallbackResponse = await fetch(`${API_URL}/sobreturnos/validate?date=${formattedDate}&sobreturnoNumber=${numero}`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': CHATBOT_API_KEY
                                }
                            });

                            if (!fallbackResponse.ok) {
                                console.error(`[SOBRETURNO FLOW] Error de validación para ${numero}:`, await fallbackResponse.text());
                                return false;
                            }

                            const fallbackData = await fallbackResponse.json();
                            console.log(`[SOBRETURNO FLOW] Respuesta de validación fallback para ${numero}:`, fallbackData);
                            return fallbackData.available === true;
                        } catch (apiError) {
                            console.error(`[SOBRETURNO FLOW] Error en llamada al API para ${numero}:`, apiError);
                            return false;
                        }
                    } catch (error) {
                        console.error(`[SOBRETURNO FLOW] Error al verificar ${numero}:`, error);
                        if (error.response) {
                            console.error('Error Response:', {
                                status: error.response.status,
                                data: error.response.data
                            });
                        } else if (error.request) {
                            console.error('Error Request:', error.request);
                        } else {
                            console.error('Error Message:', error.message);
                        }
                        return false;
                    }
                };

                // Verificar mañana y tarde en paralelo para mayor eficiencia
                const verificacionesManiana = await Promise.all(
                    Array.from({ length: 5 }, (_, i) => i + 1)
                        .map(async num => ({
                            numero: num,
                            disponible: await verificarDisponibilidad(num)
                        }))
                );

                const verificacionesTarde = await Promise.all(
                    Array.from({ length: 5 }, (_, i) => i + 6)
                        .map(async num => ({
                            numero: num,
                            disponible: await verificarDisponibilidad(num)
                        }))
                );

                // Filtrar y agregar solo los realmente disponibles
                disponiblesManiana.push(...verificacionesManiana
                    .filter(v => v.disponible)
                    .map(v => ({ numero: v.numero })));

                disponiblesTarde.push(...verificacionesTarde
                    .filter(v => v.disponible)
                    .map(v => ({ numero: v.numero })));

                console.log('[SOBRETURNO FLOW] Disponibles mañana:', disponiblesManiana);
                console.log('[SOBRETURNO FLOW] Disponibles tarde:', disponiblesTarde);

                // Verificar si hay sobreturnos disponibles
                const sobreturnosDisponibles = [...disponiblesManiana, ...disponiblesTarde];

                if (sobreturnosDisponibles.length === 0) {
                    await flowDynamic('❌ Lo siento, no hay sobreturnos disponibles para hoy.' + await generarOpcionesSobreturno());
                    return;
                }

                let message = `📅 *SOBRETURNOS DISPONIBLES*\n`;
                message += `📆 *Fecha:* ${fechaFormateada}\n\n`;

                // Si hay sobreturnos por la mañana
                if (disponiblesManiana.length > 0) {
                    message += '🌅 *Turno Mañana (11:00):*\n';
                    disponiblesManiana.sort((a, b) => a.numero - b.numero)
                        .forEach(s => {
                            message += `${s.numero}. ✅ Sobreturno disponible\n`;
                        });
                    message += '\n';
                }

                // Si hay sobreturnos por la tarde
                if (disponiblesTarde.length > 0) {
                    message += '🌇 *Turno Tarde (19:00):*\n';
                    disponiblesTarde.sort((a, b) => a.numero - b.numero)
                        .forEach(s => {
                            message += `${s.numero}. ✅ Sobreturno disponible\n`;
                        });
                }

                // Información de total
                // message += `\nℹ️ Total disponibles: ${sobreturnosDisponibles.length} sobreturnos`;

                message += '\n📝 *Para seleccionar un sobreturno, responde con el número correspondiente*';
                message += '\n❌ Para cancelar, escribe *cancelar*';

                await state.update({
                    availableSobreturnos: sobreturnosDisponibles,
                    appointmentDate: formattedDate,
                    totalSobreturnos: sobreturnosDisponibles.length,
                    disponiblesManiana,
                    disponiblesTarde
                });
                await flowDynamic(message);
            } catch (error) {
                console.error('[SOBRETURNO] Error en paso 3:', error);
                await flowDynamic('❌ Ocurrió un error al consultar los sobreturnos. Por favor, intenta nuevamente más tarde.');
                await state.clear();
            }
        }
    )
    .addAnswer(
        '✍️ *Selecciona el sobreturno que deseas:*\n\n_Responde con el número del sobreturno elegido (1-10)_',
        { capture: true },
        async (ctx, { gotoFlow, flowDynamic, state }) => {
            try {
                console.log('[SOBRETURNO] Procesando selección:', ctx.body);
                const userInput = ctx.body.trim().toLowerCase();

                // Verificar cancelación
                if (userInput === 'cancelar') {
                    await state.clear();
                    await flowDynamic(`❌ *Solicitud de sobreturno cancelada.*\n\nSi necesitas ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!`);
                    return gotoFlow(goodbyeFlow);
                }

                // Validar que sea un número entre 1 y 10
                const numero = parseInt(userInput);
                if (isNaN(numero) || numero < 1 || numero > 10) {
                    await flowDynamic('❌ Por favor, responde con un número válido (1-10) o escribe *cancelar* para cancelar.');
                    return;
                }

                // Obtener datos del estado
                const sobreturnos = state.get('availableSobreturnos');
                const appointmentDate = state.get('appointmentDate');
                const clientName = state.get('clientName');
                const socialWork = state.get('socialWork');
                const phone = ctx.from;
                const disponiblesManiana = state.get('disponiblesManiana') || [];
                const disponiblesTarde = state.get('disponiblesTarde') || [];

                if (!clientName || !socialWork || !appointmentDate || !sobreturnos) {
                    console.error('[SOBRETURNO] Datos faltantes:', { clientName, socialWork, appointmentDate, sobreturnos });
                    await flowDynamic('❌ Faltan datos para procesar el sobreturno. Por favor, inicia nuevamente escribiendo "sobreturno".');
                    await state.clear();
                    return;
                }

                // Mostrar confirmación antes de crear
                await flowDynamic(`⏳ *Procesando tu sobreturno...*\n\n📝 *Resumen:*\n👤 ${clientName}\n🏥 ${socialWork}\n🔢 Sobreturno`)



                // Asignar horario fijo SOLO tarde (19:00 a 20:00)
                const sobreturnoHorariosTarde = [
                    '19:00', '19:15', '19:30', '19:45', '20:00'
                ];
                let horarioAsignado = '';
                if (disponiblesManiana.length === 0 && disponiblesTarde.length > 0) {
                    // Solo se pueden seleccionar sobreturnos de la tarde
                    if (numero >= 6 && numero <= 10) {
                        horarioAsignado = sobreturnoHorariosTarde[numero - 6];
                    } else {
                        await flowDynamic('❌ Solo puedes seleccionar sobreturnos de la tarde (6-10), los de la mañana ya están ocupados.');
                        return;
                    }
                } else {
                    // Si hay disponibles en la mañana, permitir ambos
                    if (numero >= 6 && numero <= 10) {
                        horarioAsignado = sobreturnoHorariosTarde[numero - 6];
                    } else if (numero >= 1 && numero <= 5) {
                        // Si selecciona de la mañana, asignar horario de la mañana
                        const sobreturnoHorariosManiana = [
                            '11:00', '11:15', '11:30', '11:45', '12:00'
                        ];
                        horarioAsignado = sobreturnoHorariosManiana[numero - 1];
                    } else {
                        await flowDynamic('❌ Selección inválida. Elige un número entre 1 y 10.');
                        return;
                    }
                }

                // Crear el sobreturno con horario fijo
                const sobreturnoData = {
                    clientName,
                    socialWork,
                    phone: phone,
                    date: appointmentDate,
                    sobreturnoNumber: numero,
                    time: horarioAsignado,
                    email: phone + '@phone.com'
                };

                // Enviar sobreturnoData al backend
                try {
                    // Validación doble de disponibilidad
                    console.log('[SOBRETURNO] Validando disponibilidad final:', {
                        date: appointmentDate,
                        numero: numero
                    });

                    // 1. Limpiar caché y obtener estado actualizado
                    let reservadosActuales = [];
                    try {
                        // Limpiar caché
                        await fetch(`${API_URL}/sobreturnos/cache/clear`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': CHATBOT_API_KEY
                            },
                            body: JSON.stringify({ date: appointmentDate })
                        });

                        // Obtener estado actualizado
                        const response = await fetch(`${API_URL}/sobreturnos/available/${appointmentDate}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': CHATBOT_API_KEY
                            }
                        });
                        if (!response.ok) {
                            throw new Error('Error al obtener estado actualizado');
                        }

                        const estadoActual = await response.json();
                        reservadosActuales = estadoActual.reservados || [];
                        console.log('[SOBRETURNO] Estado actual:', estadoActual);
                        console.log('[SOBRETURNO] Reservados actuales:', reservadosActuales);
                    } catch (error) {
                        console.error('[SOBRETURNO] Error al actualizar estado:', error);
                        // Continuar con la lista vacía en caso de error
                    }

                    // 3. Verificar si ya está reservado
                    const yaReservado = reservadosActuales.some(r => r.sobreturnoNumber === numero);
                    if (yaReservado) {
                        console.log('[SOBRETURNO] El sobreturno ya está reservado');
                        await flowDynamic('❌ Lo siento, este sobreturno ya no está disponible. Por favor, elige otro número.');
                        return;
                    }

                    // 4. Verificación final de disponibilidad
                    const isAvailable = await sobreturnoService.isSobreturnoAvailable(appointmentDate, numero);
                    if (!isAvailable) {
                        console.log('[SOBRETURNO] El sobreturno no está disponible');
                        await flowDynamic('❌ Lo siento, este sobreturno ya no está disponible. Por favor, elige otro número.');
                        return;
                    }

                    console.log('[SOBRETURNO] Creando sobreturno:', sobreturnoData);

                    try {
                        // Crear sobreturno usando la nueva ruta directa
                        const response = await fetch(`${API_URL}/sobreturnos`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': CHATBOT_API_KEY
                            },
                            body: JSON.stringify(sobreturnoData)
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('[SOBRETURNO] Error al crear sobreturno:', {
                                status: response.status,
                                error: errorText
                            });
                            throw new Error(`Error al crear sobreturno: ${errorText}`);
                        }

                        const result = await response.json();
                        console.log('[SOBRETURNO] Error en respuesta:', result);

                        // Verificar si la respuesta es válida: o bien tiene success=true o es el objeto sobreturno completo
                        if (result.success || result._id) {
                            console.log('[SOBRETURNO] Sobreturno creado exitosamente');

                            // Limpiar todas las cachés relacionadas
                            try {
                                await fetch(`${API_URL}/sobreturnos/cache/clear`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-API-Key': CHATBOT_API_KEY
                                    },
                                    body: JSON.stringify({ date: appointmentDate })
                                }).catch(e => console.log('Error al limpiar caché, continuando...'));
                            } catch (cacheError) {
                                console.log('Error no crítico al limpiar caché:', cacheError);
                                // Continuamos aunque falle la limpieza de caché
                            }

                            // Confirmación exitosa con horario específico
                            const horarioMostrado = numero <= 5 ? '11:00' : '19:00';
                            const confirmationMessage = `✨ *CONFIRMACIÓN DE SOBRETURNO* ✨\n\n` +
                                `✅ *¡Tu sobreturno ha sido agendado exitosamente!*\n\n` +
                                `📅 *Fecha:* ${formatearFechaEspanol(appointmentDate)}\n` +
                                `🔢 *Sobreturno:* ${numero}\n` +
                                // `🕒 *Horario:* ${horarioMostrado}\n` +
                                `👤 *Paciente:* ${clientName}\n` +
                                `📞 *Teléfono:* ${phone}\n` +
                                `🏥 *Obra Social:* ${socialWork}\n\n` +
                                `⚠️ *IMPORTANTE:*\n` +
                                `• Llegue 30 minutos antes\n` +
                                `• Traiga documento de identidad\n` +
                                `• Traiga carnet de obra social\n` +
                                `• *El sobreturno depende de la disponibilidad del médico*\n\n` +
                                `*¡Gracias por confiar en nosotros!* 🙏`;
                            await flowDynamic(confirmationMessage);
                        } else {
                            console.error('[SOBRETURNO] Error en respuesta:', result);
                            throw new Error('Respuesta inválida del servidor');
                        }
                    } catch (error) {
                        console.error('[SOBRETURNO] Error detallado:', error);
                        let errorMessage = '❌ Lo siento, ocurrió un error al agendar el sobreturno.';

                        if (error.message.includes('already exists')) {
                            errorMessage = '❌ Este sobreturno ya ha sido reservado por otro paciente.';
                        } else if (error.message.includes('not available')) {
                            errorMessage = '❌ Este sobreturno ya no está disponible.';
                        }

                        await flowDynamic(errorMessage + ' Por favor, intenta con otro número o más tarde.' + await generarOpcionesSobreturno());
                        return;
                    }
                } catch (error) {
                    console.error('[SOBRETURNO] Error al enviar al backend:', error);
                    await flowDynamic('❌ Ocurrió un error inesperado al agendar el sobreturno. Por favor, intenta nuevamente más tarde.' + await generarOpcionesSobreturno());
                }
                await state.clear();
                return gotoFlow(goodbyeFlow);
            } catch (error) {
                console.error('[SOBRETURNO] Error al procesar:', error);
                await flowDynamic('❌ Ocurrió un error inesperado. Por favor, intenta nuevamente más tarde.' + await generarOpcionesSobreturno());
                await state.clear();
            }
        }
    );


// Flujo para recopilar datos del cliente y crear la cita normal
export const clientDataFlow = addKeyword(['datos_cliente'])
    .addAnswer(
        'Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
        { capture: true }
    )
    .addAction(async (ctx, { state, flowDynamic, gotoFlow }) => {
        // Check cancelar global
        if (ctx.body.trim().toLowerCase() === 'cancelar') {
            await state.clear();
            await flowDynamic('❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!\n📞 *3735604949*');
            return gotoFlow(goodbyeFlow);
        }
        const name = ctx.body.trim();
        await state.update({ clientName: name });
    })
    .addAnswer(
        '*Por favor*, selecciona tu *OBRA SOCIAL* de la siguiente lista:\n\n' +
        '1️⃣ INSSSEP\n' +
        '2️⃣ Swiss Medical\n' +
        '3️⃣ OSDE\n' +
        '4️⃣ Galeno\n' +
        '5️⃣ CONSULTA PARTICULAR\n' +
        '6️⃣ Otras Obras Sociales\n\n' +
        '_Responde con el número correspondiente (1, 2, 3, 4, 5 o 6)_',
        { capture: true }
    )
    .addAction(async (ctx, { state, flowDynamic, gotoFlow }) => {
        // Check cancelar global
        if (ctx.body.trim().toLowerCase() === 'cancelar') {
            await state.clear();
            await flowDynamic('❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!\n📞 *3735604949*');
            return gotoFlow(goodbyeFlow);
        }
        const socialWorkOption = ctx.body.trim();
        const socialWorks = {
            '1': 'INSSSEP',
            '2': 'Swiss Medical',
            '3': 'OSDE',
            '4': 'Galeno',
            '5': 'CONSULTA PARTICULAR',
            '6': 'Otras Obras Sociales'
        };

        const socialWork = socialWorks[socialWorkOption] || 'CONSULTA PARTICULAR';
        await state.update({ socialWork });
    })
    .addAnswer(
        '*Vamos a proceder con la reserva de tu cita.*'
    )
    .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
        try {
            const clientName = state.get('clientName');
            const socialWork = state.get('socialWork');
            const selectedSlot = state.get('selectedSlot');
            const selectedSobreturno = state.get('selectedSobreturno');
            const isSobreturnoMode = state.get('isSobreturnoMode');
            const appointmentDate = state.get('appointmentDate');
            const phone = ctx.from;

            // Determinar si es un sobreturno o turno normal
            const isCreatingSobreturno = isSobreturnoMode && selectedSobreturno;

            // Validar datos requeridos
            if (!clientName || !socialWork || !appointmentDate) {
                console.error('Datos faltantes en el estado:', {
                    clientName,
                    socialWork,
                    appointmentDate
                });
                await flowDynamic('❌ Hubo un problema con los datos de la cita. Por favor, intenta nuevamente desde el inicio.');
                return;
            }

            if (isCreatingSobreturno) {
                // CREAR SOBRETURNO
                if (!selectedSobreturno) {
                    await flowDynamic('❌ Hubo un problema con el sobreturno seleccionado. Por favor, intenta nuevamente.');
                    return;
                }

                const sobreturnoData = {
                    sobreturnoNumber: selectedSobreturno.numero,
                    date: appointmentDate,
                    clientName,
                    socialWork,
                    phone,
                    email: phone + '@phone.com'
                };

                console.log('=== CREANDO SOBRETURNO ===');
                console.log('Datos:', sobreturnoData);

                const sobreturnoResponse = await fetch(`${API_URL}/sobreturnos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': CHATBOT_API_KEY
                    },
                    body: JSON.stringify(sobreturnoData)
                });

                const sobreturnoResult = await sobreturnoResponse.json();

                if (!sobreturnoResponse.ok || sobreturnoResult.error) {
                    await flowDynamic(`❌ ${sobreturnoResult.error || 'Hubo un problema al crear el sobreturno. Por favor, intenta nuevamente.'}`);
                    return;
                }

                const fechaFormateada = formatearFechaEspanol(sobreturnoResult.date);
                const message = `✨ *CONFIRMACIÓN DE SOBRETURNO* ✨\n\n` +
                    `✅ El sobreturno ha sido agendado exitosamente\n\n` +
                    `📌 *Sobreturno:* ${sobreturnoResult.sobreturnoNumber}\n` +
                    `📅 *Fecha:* ${fechaFormateada}\n` +
                    `🕒 *Hora:* ${sobreturnoResult.time}\n` +
                    `👤 *Paciente:* ${sobreturnoResult.clientName}\n` +
                    `📞 *Teléfono:* ${sobreturnoResult.phone}\n` +
                    `🏥 *Obra Social:* ${sobreturnoResult.socialWork}\n\n` +
                    `ℹ️ *Información importante:*\n` +
                    `- Por favor, llegue 30 minutos antes de su cita\n` +
                    `- Traiga su documento de identidad\n` +
                    `- Traiga su carnet de obra social\n\n` +
                    `📌 *Para cambios o cancelaciones:*\n` +
                    `Por favor contáctenos con anticipación\n\n` +
                    `*¡Gracias por confiar en nosotros!* 🙏\n` +
                    `----------------------------------`;
                await flowDynamic(message);

            } else {
                // CREAR TURNO NORMAL
                if (!selectedSlot || !selectedSlot.displayTime) {
                    console.error('selectedSlot inválido:', selectedSlot);
                    await flowDynamic('❌ Hubo un problema con el horario seleccionado. Por favor, intenta nuevamente.');
                    return;
                }

                const appointmentData: AppointmentData = {
                    clientName,
                    socialWork,
                    phone: phone,
                    date: appointmentDate,
                    time: selectedSlot.displayTime,
                    email: phone + '@phone.com'
                };

                const result = await createAppointment(appointmentData);

                if (result.error) {
                    await flowDynamic(`❌ ${result.message || 'Hubo un problema al crear la cita. Por favor, intenta nuevamente.'}`);
                    return;
                }

                const data = result.data;
                if (data && data.success) {
                    const fechaFormateada = formatearFechaEspanol(data.data.date);
                    const message = `✨ *CONFIRMACIÓN DE CITA MÉDICA* ✨\n\n` +
                        `✅ La cita ha sido agendada exitosamente\n\n` +
                        `📅 *Fecha:* ${fechaFormateada}\n` +
                        `🕒 *Hora:* ${data.data.time}\n` +
                        `👤 *Paciente:* ${data.data.clientName}\n` +
                        `📞 *Teléfono:* ${data.data.phone}\n` +
                        `🏥 *Obra Social:* ${data.data.socialWork}\n\n` +
                        `ℹ️ *Información importante:*\n` +
                        `- Por favor, llegue 30 minutos antes de su cita\n` +
                        `- Traiga su documento de identidad\n` +
                        `- Traiga su carnet de obra social\n\n` +
                        `📌 *Para cambios o cancelaciones:*\n` +
                        `Por favor contáctenos con anticipación\n\n` +
                        `*¡Gracias por confiar en nosotros!* 🙏\n` +
                        `----------------------------------`;
                    await flowDynamic(message);
                } else {
                    await flowDynamic('❌ Lo siento, hubo un problema al crear la cita. Por favor, intenta nuevamente.');
                }
            }
        } catch (error) {
            console.error('Error al crear la cita:', error);
            await flowDynamic('❌ Lo siento, ocurrió un error al crear la cita. Por favor, intenta nuevamente más tarde.');
        }

        // Limpiar estado y dirigir a goodbyeFlow
        await state.clear();
        return gotoFlow(goodbyeFlow);
    });

// Flujo de cancelación global — disponible desde cualquier momento
export const cancelFlow = addKeyword(['cancelar', 'cancel', 'salir'])
    .addAction(async (ctx, { flowDynamic, state }) => {
        await state.clear();
        await flowDynamic('❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!\n📞 *3735604949*');
    });

// Flujo para agendar una cita médica
//Flujo de despedida
export const goodbyeFlow = addKeyword(['bye', 'adiós', 'chao', 'chau'])
    .addAnswer(
        `👋 *¡Hasta luego! Si necesitas más ayuda, no dudes en contactarnos nuevamente.*`,
        { delay: 1000 }
    );



// Variable para controlar el estado de conexión del bot
let isConnected = true;
let qrCode = '';

// Flujo admin para gestionar la sesión
const adminFlow = addKeyword(['!admin', '!help'])
    .addAction(async (ctx, { flowDynamic, state }) => {
        if (ctx.from !== process.env.ADMIN_NUMBER) {
            return;
        }

        if (ctx.body.toLowerCase() === '!help') {
            await flowDynamic(
                "Comandos disponibles:\n" +
                "!disconnect - Desconecta la sesión de WhatsApp\n" +
                "!status - Muestra el estado actual del bot"
            );
            return;
        }

        if (ctx.body.toLowerCase() === '!disconnect') {
            isConnected = false;
            qrCode = '';
            await state.clear();
            await flowDynamic("Sesión desconectada. Escanea el código QR para reconectar.");
            return;
        }

        if (ctx.body.toLowerCase() === '!status') {
            await flowDynamic(`Estado del bot: ${isConnected ? 'Conectado' : 'Desconectado'}`);
            return;
        }
    });


// //FLujo Bienvenida dias de no atencion
// const welcomeKeywords = ['hi', 'hello', 'hola', "buenas", "hola doctor", "hola Doctor", "doctor", "DOCTOR", "buenos días", "buenas tardes", "buenas noches", "ho", "hola ", "ola", "ola ", "hi", "ole"].map(saludo => saludo.toLowerCase()) as [string, ...string[]];

// const welcomeFlow = addKeyword(welcomeKeywords)
//     .addAction(async (ctx, { state, flowDynamic }) => {
//         await flowDynamic(`🤖🩺 *¡Bienvenido al Asistente Virtual del Dr.Kulinka!* 🩺
// 📢⚠️*Desde 24 de NOVIEMBRE a 01 de DICIEMBRE NO ATIENDE DR. KULINKA* por favor comunicarse nuevamente, la próxima semana⚠️`,);
//     });

// Flujo de bienvenida con horarios disponibles
const welcomeKeywords = ['hi', 'hello', 'hola', "buenas","hola doctor","hola Doctor", "doctor", "DOCTOR",  "buenos días", "buenas tardes", "buenas noches", "ho", "hola ", "ola", "ola ", "hi", "ole", 'turnos', 'turno', 'Turnos', 'Turno'].map(saludo => saludo.toLowerCase()) as [string, ...string[]];

const welcomeFlow = addKeyword<Provider, IDBDatabase>(welcomeKeywords)
    .addAction(async (ctx, { state, flowDynamic }) => {
        // Solo mostrar bienvenida si NO hay flujo activo ni datos de sobreturno en progreso
        const clientName = state.get('clientName');
        const socialWork = state.get('socialWork');
        const availableSlots = state.get('availableSlots');
        if (clientName || socialWork || availableSlots) {
            // Hay un flujo activo, no interrumpir
            return;
        }
        
        try {
            console.log('=== DEBUG WELCOME FLOW CON HORARIOS ===');
            console.log('1. Iniciando flujo de bienvenida con horarios');
            console.log('Mensaje recibido:', ctx.body);
            
            const timeZone = 'America/Argentina/Buenos_Aires';
            const now = new Date();
            const localChatDate = toZonedTime(now, timeZone);

            const currentHour = parseInt(format(localChatDate, 'HH'), 10);
            const currentMinute = parseInt(format(localChatDate, 'mm'), 10);

            console.log('2. Hora actual:', `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);

            const getNextWorkingDay = (date: Date): Date => {
                const nextDate = new Date(date);
                nextDate.setHours(0, 0, 0, 0);
                if (currentHour > 20 || (currentHour === 20 && currentMinute >= 30)) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                return nextDate;
            };

            const appointmentDate = getNextWorkingDay(localChatDate);
            const formattedDate = format(appointmentDate, 'yyyy-MM-dd');
            console.log('3. Fecha de cita:', formattedDate);

            // === CHECK DE DISPONIBILIDAD DEL MÉDICO ===
            let blockedPeriod: string | null = null;
            try {
                const unavailRes = await fetch(`${API_URL}/unavailability?date=${formattedDate}`, {
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': CHATBOT_API_KEY }
                });
                if (unavailRes.ok) {
                    const unavailData = await unavailRes.json();
                    if (unavailData.success && unavailData.data.length > 0) {
                        blockedPeriod = unavailData.data[0].period;
                        console.log('[UNAVAILABILITY] Bloqueo detectado:', blockedPeriod, 'para', formattedDate);
                    }
                }
            } catch (e) {
                console.log('[UNAVAILABILITY] Error al consultar bloqueos (fail-safe, continúa normal)');
            }

            const getFollowingWorkingDay = (date: Date): Date => {
                const nd = new Date(date);
                nd.setDate(nd.getDate() + 1);
                nd.setHours(0, 0, 0, 0);
                while (nd.getDay() === 0 || nd.getDay() === 6) nd.setDate(nd.getDate() + 1);
                return nd;
            };

            if (blockedPeriod === 'full') {
                const nextDay = getFollowingWorkingDay(appointmentDate);
                await flowDynamic(
                    `🤖🩺 *¡Bienvenido al Asistente Virtual del Dr.Kulinka!* 🩺\n\n` +
                    `⚠️ *El Dr. Kulinka no atiende el ${formatearFechaEspanol(formattedDate)}.*\n\n` +
                    `📅 *Próximo día disponible:* ${formatearFechaEspanol(format(nextDay, 'yyyy-MM-dd'))}\n\n` +
                    `📞 Para consultar llamá al *3735604949*`
                );
                return;
            }

            // Mensaje de bienvenida
            await flowDynamic(`🤖🩺 *¡Bienvenido al Asistente Virtual del Dr.Kulinka!* 🩺`);
                //\n\n‼️*EL DIA 16 y 17 DE FEBRERO NO ATIENDE*‼️\n\n


            // Obtener las citas reservadas
            const reservedTimes = await getReservedAppointments(formattedDate);
            console.log('4. Horarios reservados:', reservedTimes);

            const slotResponse = await fetchAvailableSlots(appointmentDate);
            const { data } = slotResponse;

            if (data.success) {
                const fechaFormateada = formatearFechaEspanol(data.data.displayDate);
                let message = `📅 *Horarios disponibles*\n`;
                message += `📆 Para el día: *${fechaFormateada}*\n\n`;

                const slots: TimeSlot[] = [];
                let morningMessage = '';
                let afternoonMessage = '';

                // Filtrar horarios disponibles (respetando bloqueos de disponibilidad)
                const availableMorning = (blockedPeriod === 'morning') ? [] : data.data.available.morning
                    .filter(slot => {
                        const [slotHour, slotMinute] = slot.displayTime.split(':').map(Number);

                        if (reservedTimes.includes(slot.displayTime)) {
                            return false;
                        }

                        if (format(appointmentDate, 'yyyy-MM-dd') === format(localChatDate, 'yyyy-MM-dd')) {
                            return slot.status === 'available' &&
                                (slotHour > currentHour ||
                                    (slotHour === currentHour && slotMinute > currentMinute));
                        }
                        return slot.status === 'available';
                    });

                const availableAfternoon = (blockedPeriod === 'afternoon') ? [] : data.data.available.afternoon
                    .filter(slot => {
                        const [slotHour, slotMinute] = slot.displayTime.split(':').map(Number);

                        if (reservedTimes.includes(slot.displayTime)) {
                            return false;
                        }

                        if (format(appointmentDate, 'yyyy-MM-dd') === format(localChatDate, 'yyyy-MM-dd')) {
                            return slot.status === 'available' &&
                                (slotHour > currentHour ||
                                    (slotHour === currentHour && slotMinute > currentMinute));
                        }
                        return slot.status === 'available';
                    });

                if (availableMorning.length > 0) {
                    morningMessage = `*🌅 Horarios de mañana:*\n`;
                    availableMorning.forEach((slot, index) => {
                        slots.push(slot);
                        morningMessage += `${slots.length}. ⏰ ${slot.displayTime}\n`;
                    });
                    message += morningMessage + '\n';
                }

                if (availableAfternoon.length > 0) {
                    afternoonMessage = `*🌇 Horarios de tarde:*\n`;
                    availableAfternoon.forEach((slot, index) => {
                        slots.push(slot);
                        afternoonMessage += `${slots.length}. ⏰ ${slot.displayTime}\n`;
                    });
                    message += afternoonMessage;
                }

                if (slots.length === 0) {
                    // Si hay bloqueo de período, informar y no caer en sobreturnos
                    if (blockedPeriod === 'morning' || blockedPeriod === 'afternoon') {
                        const periodStr = blockedPeriod === 'morning' ? 'la mañana' : 'la tarde';
                        const nextDay = getFollowingWorkingDay(appointmentDate);
                        await flowDynamic(
                            `⚠️ *El Dr. Kulinka no atiende ${periodStr} del ${formatearFechaEspanol(formattedDate)}.*\n\n` +
                            `📅 *Próximo día disponible:* ${formatearFechaEspanol(format(nextDay, 'yyyy-MM-dd'))}\n\n` +
                            `📞 Para consultar llamá al *3735604949*`
                        );
                        return;
                    }
                    // No hay turnos normales, consultar sobreturnos disponibles
                    await flowDynamic('❌ No hay turnos normales disponibles para este día.');
                    await flowDynamic('⏳ *Consultando sobreturnos disponibles...*');

                    try {
                        const sobreturnosResponse = await fetch(`${API_URL}/sobreturnos/date/${formattedDate}`, {
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': CHATBOT_API_KEY
                            }
                        });

                        const sobreturnosData = await sobreturnosResponse.json();

                        if (sobreturnosData.success && sobreturnosData.data.disponibles.length > 0) {
                            const sobreturnos = sobreturnosData.data.disponibles;

                            let sobreturnoMessage = `🏥 *SOBRETURNOS DISPONIBLES*\n`;
                            sobreturnoMessage += `📆 Para el día: *${formatearFechaEspanol(formattedDate)}*\n\n`;

                            sobreturnos.forEach((st: any) => {
                                sobreturnoMessage += `${st.numero}. 📌 Sobreturno ${st.numero}\n`;
                            });

                            sobreturnoMessage += '\n📝 *Para reservar, responde con el número del sobreturno que deseas*';
                            sobreturnoMessage += '\n❌ Para cancelar, escribe *"cancelar"*';

                            await state.update({
                                availableSobreturnos: sobreturnos,
                                appointmentDate: formattedDate,
                                isSobreturnoMode: true,
                                fullConversationTimestamp: format(localChatDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                                conversationStartTime: format(localChatDate, 'HH:mm'),
                            });

                            await flowDynamic(sobreturnoMessage);
                        } else {
                            await flowDynamic('❌ Lo siento, tampoco hay sobreturnos disponibles para este día.');
                            await flowDynamic('📞 Para más información, llamá al *3735604949*');
                        }
                    } catch (error) {
                        console.error('Error al consultar sobreturnos:', error);
                        await flowDynamic('❌ Error al consultar sobreturnos.');
                        await flowDynamic('📞 Por favor, llamá al *3735604949* para más información.');
                    }
                    return;
                }

                await state.update({
                    availableSlots: slots,
                    appointmentDate: format(appointmentDate, 'yyyy-MM-dd'),
                    fullConversationTimestamp: format(localChatDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                    conversationStartTime: format(localChatDate, 'HH:mm'),
                });

                message += '\n📝 *Para reservar, responde con el número del horario que deseas*\n ℹ️*Para SOBRETURNOS LLAMAR AL 3735604949*';
                // message += '\n🏥 Si necesitas un sobreturno, escribe *"sobreturnos"*';
                // message += '‼️EL DIA 16 y 17 DE FEBRERO NO ATIENDE‼️*\n\n';

                await flowDynamic(message);
            } else {
                await flowDynamic('Lo siento, hubo un problema al obtener los horarios disponibles.');
                await flowDynamic('\n🏥 Si necesitas atención urgente, escribe *"sobreturnos"*');
            }
        } catch (error) {
            console.error('Error al procesar la bienvenida:', error);
            await flowDynamic('Lo siento, ocurrió un error al consultar los horarios. Por favor, intenta nuevamente más tarde.');
        }
    })
    .addAnswer('', { capture: true }, async (ctx, { gotoFlow, flowDynamic, state }) => {
        // Verificar si estamos esperando la opción de agendamiento
        const waitingForBookingOption = state.get('waitingForBookingOption');
        
        if (waitingForBookingOption) {
            const option = ctx.body.trim();
            
            if (option === '1') {
                // Continuar con agendamiento por WhatsApp
                await state.update({ waitingForBookingOption: false });
                await flowDynamic('⏳ *Consultando horarios disponibles...*');
                
                // Aquí va la lógica de mostrar horarios
                const timeZone = 'America/Argentina/Buenos_Aires';
                const now = new Date();
                const localChatDate = toZonedTime(now, timeZone);
                
                const currentHour = parseInt(format(localChatDate, 'HH'), 10);
                const currentMinute = parseInt(format(localChatDate, 'mm'), 10);
                
                const getNextWorkingDay = (date: Date): Date => {
                    const nextDate = new Date(date);
                    nextDate.setHours(0, 0, 0, 0);
                    if (currentHour > 20 || (currentHour === 20 && currentMinute >= 30)) {
                        nextDate.setDate(nextDate.getDate() + 1);
                    }
                    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
                        nextDate.setDate(nextDate.getDate() + 1);
                    }
                    return nextDate;
                };
                
                const appointmentDate = getNextWorkingDay(localChatDate);
                const formattedDate = format(appointmentDate, 'yyyy-MM-dd');
                
                // Obtener las citas reservadas
                const reservedTimes = await getReservedAppointments(formattedDate);
                
                const slotResponse = await fetchAvailableSlots(appointmentDate);
                const { data } = slotResponse;
                
                if (data.success) {
                    const fechaFormateada = formatearFechaEspanol(data.data.displayDate);
                    let message = `📅 *Horarios disponibles*\n`;
                    message += `📆 Para el día: *${fechaFormateada}*\n\n`;
                    
                    const slots: TimeSlot[] = [];
                    let morningMessage = '';
                    let afternoonMessage = '';
                    
                    // Filtrar horarios disponibles
                    const availableMorning = data.data.available.morning
                        .filter(slot => {
                            const [slotHour, slotMinute] = slot.displayTime.split(':').map(Number);
                            
                            if (reservedTimes.includes(slot.displayTime)) {
                                return false;
                            }
                            
                            if (format(appointmentDate, 'yyyy-MM-dd') === format(localChatDate, 'yyyy-MM-dd')) {
                                return slot.status === 'available' &&
                                    (slotHour > currentHour ||
                                        (slotHour === currentHour && slotMinute > currentMinute));
                            }
                            return slot.status === 'available';
                        });
                    
                    const availableAfternoon = data.data.available.afternoon
                        .filter(slot => {
                            const [slotHour, slotMinute] = slot.displayTime.split(':').map(Number);
                            
                            if (reservedTimes.includes(slot.displayTime)) {
                                return false;
                            }
                            
                            if (format(appointmentDate, 'yyyy-MM-dd') === format(localChatDate, 'yyyy-MM-dd')) {
                                return slot.status === 'available' &&
                                    (slotHour > currentHour ||
                                        (slotHour === currentHour && slotMinute > currentMinute));
                            }
                            return slot.status === 'available';
                        }); 
                    
                    if (availableMorning.length > 0) {
                        morningMessage = `*🌅 Horarios de mañana:*\n`;
                        availableMorning.forEach((slot, index) => {
                            slots.push(slot);
                            morningMessage += `${slots.length}. ⏰ ${slot.displayTime}\n`;
                        });
                        message += morningMessage + '\n';
                    }
                    
                    if (availableAfternoon.length > 0) {
                        afternoonMessage = `*🌇 Horarios de tarde:*\n`;
                        availableAfternoon.forEach((slot, index) => {
                            slots.push(slot);
                            afternoonMessage += `${slots.length}. ⏰ ${slot.displayTime}\n`;
                        });
                        message += afternoonMessage;
                    }
                    
                    if (slots.length === 0) {
                        // No hay turnos normales, consultar sobreturnos disponibles
                        await flowDynamic('❌ No hay turnos normales disponibles para este día.');
                        await flowDynamic('⏳ *Consultando sobreturnos disponibles...*');

                        try {
                            const sobreturnosResponse = await fetch(`${API_URL}/sobreturnos/date/${formattedDate}`, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': CHATBOT_API_KEY
                                }
                            });

                            const sobreturnosData = await sobreturnosResponse.json();

                            if (sobreturnosData.success && sobreturnosData.data.disponibles.length > 0) {
                                const sobreturnos = sobreturnosData.data.disponibles;

                                let sobreturnoMessage = `🏥 *SOBRETURNOS DISPONIBLES*\n`;
                                sobreturnoMessage += `📆 Para el día: *${formatearFechaEspanol(formattedDate)}*\n\n`;

                                sobreturnos.forEach((st: any) => {
                                    sobreturnoMessage += `${st.numero}. 📌 Sobreturno ${st.numero}\n`;
                                });

                                sobreturnoMessage += '\n📝 *Para reservar, responde con el número del sobreturno que deseas*';
                                sobreturnoMessage += '\n❌ Para cancelar, escribe *"cancelar"*';

                                await state.update({
                                    availableSobreturnos: sobreturnos,
                                    appointmentDate: formattedDate,
                                    isSobreturnoMode: true,
                                    fullConversationTimestamp: format(localChatDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                                    conversationStartTime: format(localChatDate, 'HH:mm'),
                                });

                                await flowDynamic(sobreturnoMessage);
                            } else {
                                await flowDynamic('❌ Lo siento, tampoco hay sobreturnos disponibles para este día.');
                                await flowDynamic('📞 Para más información, llamá al *3735604949*');
                            }
                        } catch (error) {
                            console.error('Error al consultar sobreturnos:', error);
                            await flowDynamic('❌ Error al consultar sobreturnos.');
                            await flowDynamic('📞 Por favor, llamá al *3735604949* para más información.');
                        }
                        return;
                    }
                    
                    await state.update({
                        availableSlots: slots,
                        appointmentDate: format(appointmentDate, 'yyyy-MM-dd'),
                        fullConversationTimestamp: format(localChatDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                        conversationStartTime: format(localChatDate, 'HH:mm'),
                    });
                    
                    message += '\n📝 *Para reservar, responde con el número del horario que deseas*\n ℹ️*Para SOBRETURNOS LLAMAR AL 3735604949*';
                    message += '\n❌ Para cancelar, escribe *"cancelar"*';
                    
                    await flowDynamic(message);
                } else {
                    await flowDynamic('Lo siento, hubo un problema al obtener los horarios disponibles.');
                    await flowDynamic('\n🏥 Si necesitas atención urgente, escribe *"sobreturnos"*');
                }
                return;
                
            } else if (option === '2') {
                // Enviar enlace web
                await state.update({ waitingForBookingOption: false });
                await flowDynamic(
                    '🌐 *Agendamiento por Web*\n\n' +
                    'Puedes agendar tu turno desde nuestro sitio web:\n\n' +
                    '🔗 https://micitamedica.me/agendar-turno\n\n' +
                    '✨ *Ventajas:*\n' +
                    '• Selecciona fecha y horario\n' +
                    '• Completa tus datos\n' +
                    '• Confirmación inmediata\n\n' +
                    '📱 *Solo tienes que hacer click en el enlace*'
                );
                await state.clear();
                return gotoFlow(goodbyeFlow);
                
            } else {
                await flowDynamic('❌ Opción inválida. Por favor, responde con *1* para WhatsApp o *2* para Web.');
                return;
            }
        }

        // Lógica original de selección de horario
        if (ctx.body.toLowerCase() === 'cancelar') {
            await flowDynamic(`❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!`);
            return gotoFlow(goodbyeFlow);
        }

        const selectedSlotNumber = parseInt(ctx.body);
        const isSobreturnoMode = state.get('isSobreturnoMode');

        // Manejo de sobreturnos
        if (isSobreturnoMode) {
            const availableSobreturnos = state.get('availableSobreturnos');

            if (!availableSobreturnos || availableSobreturnos.length === 0) {
                await flowDynamic('❌ Error: No se encontraron sobreturnos disponibles.');
                return;
            }

            // Validar que el número esté en la lista de sobreturnos disponibles
            const selectedSobreturno = availableSobreturnos.find((st: any) => st.numero === selectedSlotNumber);

            if (!selectedSobreturno) {
                await flowDynamic('❌ Número de sobreturno inválido. Por favor, selecciona un número de la lista.');
                return;
            }

            await state.update({
                selectedSobreturno: selectedSobreturno,
                selectedSlot: null // Limpiar slot normal
            });

            console.log('=== DEBUG SOBRETURNO SELECCIONADO ===');
            console.log('selectedSobreturno:', selectedSobreturno);
            console.log('appointmentDate:', state.get('appointmentDate'));

            // Dirigir al flujo de recopilación de datos del cliente
            return gotoFlow(clientDataFlow);
        }

        // Manejo de turnos normales
        const availableSlots = state.get('availableSlots');

        if (isNaN(selectedSlotNumber) || selectedSlotNumber < 1 || selectedSlotNumber > availableSlots.length) {
            await flowDynamic('Número de horario inválido. Por favor, intenta nuevamente.\n *** en caso que no puedas realizarlo con el chatbot,\n_lo puedes hacer de forma_ _manual escribiendo la palabra:_ "*link*" , de esta manera no emite ticket de confirmación, pero notará que el horario que usted solicitó no se encuentra en la lista de horarios disponibles***');
            return;
        }

        const selectedSlot = availableSlots[selectedSlotNumber - 1];
        await state.update({ selectedSlot: selectedSlot });

        console.log('=== DEBUG ESTADO ANTES DE DIRIGIR A BOOK APPOINTMENT ===');
        console.log('selectedSlot guardado:', selectedSlot);
        console.log('appointmentDate:', state.get('appointmentDate'));

        // Dirigir al flujo de recopilación de datos del cliente
        return gotoFlow(clientDataFlow);
    });

// Flujo para generar enlace de reserva pública
export const publicBookingLinkFlow = addKeyword(['bazinga', 'link', 'enlace'])
    .addAction(async (ctx, { flowDynamic }) => {
        try {
            console.log('[PUBLIC LINK] Generando token temporal...');

            // Generar token temporal
            const response = await axiosInstance.post('/tokens/generate-public-token', {}, {
                headers: {
                    'X-API-Key': CHATBOT_API_KEY
                }
            });

            if (response.data.success && response.data.data.token) {
                const token = response.data.data.token;
                const expiresAt = response.data.data.expiresAt;

                // Crear URL con el token
                const bookingUrl = `https://micitamedica.me/reservar-turno?token=${token}`;

                console.log('[PUBLIC LINK] Token generado exitosamente');
                console.log('[PUBLIC LINK] URL:', bookingUrl);

                await flowDynamic(
                    `🔗 *ENLACE DE RESERVA GENERADO*\n\n` +
                    `Aquí está tu enlace personalizado para agendar una cita:\n\n` +
                    `${bookingUrl}\n\n` +
                    // `⏰ *Este enlace es válido por 7 horas*\n` +
                    // `📅 Expira: ${new Date(expiresAt).toLocaleString('es-AR')}\n\n` +
                    `Simplemente haz clic en el enlace ☝️ para completar tu reserva.`
                );
            } else {
                throw new Error('No se pudo generar el token');
            }
        } catch (error: any) {
            console.error('[PUBLIC LINK ERROR]:', error);
            await flowDynamic(
                `❌ *Error al generar el enlace*\n\n` +
                `No pude crear tu enlace de reserva. Por favor, intenta nuevamente o contacta al Dr. Kulinka.`
            );
        }
    });

const main = async () => {
    const adapterFlow = createFlow([
        // Flujos principales
        cancelFlow,          // PRIMERO: captura "cancelar" en cualquier momento fuera de capture
        //sobreTurnosTemporario,  // DEBE estar primero para evitar conflicto con "turnos"
        bookSobreturnoFlow,  // DEBE estar primero para evitar conflicto con "turnos" en welcomeFlow
        welcomeFlow,         // Se activa con saludos y muestra horarios automáticamente
        publicBookingLinkFlow, // Se activa con "bazinga", "link", "enlace"
        clientDataFlow,
        goodbyeFlow,
        adminFlow
    ])

    console.log('🔧 Creando adapter del provider (WhatsApp)...');
    const adapterProvider = createProvider(Provider, {
        version: [2, 3000, 1031870451] as any
    })
    console.log('✅ Adapter del provider creado');
    // const adapterProvider = createProvider(Provider)

    console.log('🔧 Conectando a MongoDB...');
    const adapterDB = new Database({
        dbUri: APP_CONFIG.MONGO_DB_URI,
        dbName: APP_CONFIG.MONGO_DB_NAME,
    })
    console.log('✅ MongoDB conectado');

    console.log('🔧 Creando bot...');
    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    console.log('✅ Bot creado exitosamente');

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    // Endpoint para recibir notificaciones de citas desde la web pública
    adapterProvider.server.post(
        '/api/notify-appointment',
        handleCtx(async (bot, req, res) => {
            try {
                const { appointment } = req.body;
                console.log('[NOTIFICACIÓN] Cita recibida desde web pública:', appointment);

                if (!appointment || !appointment.phone) {
                    console.error('[NOTIFICACIÓN ERROR] Datos de cita inválidos');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, message: 'Datos inválidos' }));
                }

                // Formatear el número de teléfono (asumiendo formato argentino)
                let phoneNumber = appointment.phone.replace(/\D/g, ''); // Remover todo excepto números
                if (!phoneNumber.startsWith('54')) {
                    // Si no tiene código de país, agregarlo
                    if (phoneNumber.startsWith('9')) {
                        phoneNumber = '54' + phoneNumber; // Agregar código de país
                    } else {
                        phoneNumber = '549' + phoneNumber; // Agregar código de país y 9
                    }
                }
                phoneNumber = phoneNumber + '@s.whatsapp.net';

                // Formatear la fecha en español
                const [year, month, day] = appointment.date.split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                const fechaFormateada = format(dateObj, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

                // Crear mensaje de confirmación
                const mensaje = `✅ *TURNO CONFIRMADO*\n\n` +
                    `Hola ${appointment.clientName},\n\n` +
                    `Tu turno ha sido agendado exitosamente:\n\n` +
                    `📅 *Fecha:* ${fechaFormateada}\n` +
                    `🕐 *Hora:* ${appointment.time}\n` +
                    `🏥 *Obra Social:* ${appointment.socialWork}\n\n` +
                    `📍 *Dirección:* Av. España 1081 Sur, Godoy Cruz, Mendoza\n\n` +
                    `⚠️ *Importante:*\n` +
                    `• Por favor, llega *30 minutos* antes de tu turno\n` +
                    `• Si necesitas cancelar o reprogramar, comunícate lo antes posible\n\n` +
                    `¡Te esperamos! 🩺`;

                // Enviar mensaje por WhatsApp
                await bot.sendMessage(phoneNumber, mensaje, {});
                console.log('[NOTIFICACIÓN] Mensaje de confirmación enviado a:', phoneNumber);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, message: 'Notificación enviada' }));
            } catch (error: any) {
                console.error('[NOTIFICACIÓN ERROR] Error al enviar notificación:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, message: error.message }));
            }
        })
    )

    console.log('🚀 Iniciando servidor HTTP en puerto:', PORT);
    httpServer(+PORT)
    console.log('✅ Servidor HTTP iniciado correctamente');
}

console.log('📝 Llamando a la función main()...');
main().then(() => {
    console.log('✅ main() completada exitosamente');
}).catch((error) => {
    console.error('❌ Error en main():', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});