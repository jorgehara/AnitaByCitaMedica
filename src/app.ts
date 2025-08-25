import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MongoAdapter as Database } from '@builderbot/database-mongo'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { axiosInstance, retryRequest } from './config/axios';
import { getFallbackSlots } from './utils/fallbackData';

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
import axios from 'axios'
import { es } from 'date-fns/locale'

const API_URL = process.env.API_URL || 'https://micitamedica.me/api';
console.log('API URL configurada:', API_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json()); // Agregamos middleware para parsear JSON
const pdfFolderPath = join(__dirname, 'pdfs');
app.use('/pdfs', express.static(pdfFolderPath));

const PORT = process.env.PORT ?? 3008
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

import appointmentService from './utils/appointmentService';



// Función para obtener las citas reservadas usando el nuevo servicio
async function getReservedAppointments(date: string): Promise<string[]> {
    return appointmentService.getReservedSlots(date);
}

//Flujo de sobreturnos
export const bookSobreturnoFlow = addKeyword(['2', 'sobreturno', 'sobre turno', 'sobreturnos'])
    .addAnswer(
        async (ctx) => {
            console.log('[SOBRETURNO] Paso 1: Solicitud de nombre y apellido. Mensaje:', ctx.body);
        },
        'Has seleccionado la opción de *Sobre Turno*. Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
        { capture: true }
    )
    .addAction(async (ctx, { state }) => {
        console.log('[SOBRETURNO] Paso 2: Nombre recibido:', ctx.body);
        const name = ctx.body.trim();
        await state.update({ clientName: name });
    })
    .addAnswer(
        async (ctx, { state }) => {
            const clientName = state.get('clientName');
            console.log('[SOBRETURNO] Paso 3: Solicitud de obra social. Nombre:', clientName, 'Mensaje:', ctx.body);
        },
        '*Por favor*, selecciona tu *OBRA SOCIAL* de la siguiente lista:\n\n' +
        '1️⃣ INSSSEP\n' +
        '2️⃣ Swiss Medical\n' +
        '3️⃣ OSDE\n' +
        '4️⃣ Galeno\n' +
        '5️⃣ CONSULTA PARTICULAR',
        { capture: true }
    )
    .addAction(async (ctx, { state }) => {
        console.log('[SOBRETURNO] Paso 4: Obra social recibida:', ctx.body);
        const socialWorkOption = ctx.body.trim();
        const socialWorks = {
            '1': 'INSSSEP',
            '2': 'Swiss Medical',
            '3': 'OSDE',
            '4': 'Galeno',
            '5': 'CONSULTA PARTICULAR',
            '6': 'CONSULTA PARTICULAR',
            '7': 'CONSULTA PARTICULAR',
            '8': 'CONSULTA PARTICULAR',
            '9': 'CONSULTA PARTICULAR',
        };
        const socialWork = socialWorks[socialWorkOption] || 'CONSULTA PARTICULAR';
        await state.update({ socialWork });
    })
    .addAction(async (ctx, { flowDynamic, state }) => {
        console.log('[SOBRETURNO] Paso 5: Preparando horarios disponibles...');
        // Obtener la fecha del sobreturno (puedes usar la lógica de availableSlotsFlow)
        const timeZone = 'America/Argentina/Buenos_Aires';
        const now = new Date();
        const localChatDate = toZonedTime(now, timeZone);
        const getNextWorkingDay = (date: Date): Date => {
            const nextDate = new Date(date);
            nextDate.setHours(0, 0, 0, 0);
            if (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
                // Si es sábado o domingo, pasa al lunes
                while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
            }
            return nextDate;
        };
        const appointmentDate = getNextWorkingDay(localChatDate);
        const formattedDate = format(appointmentDate, 'yyyy-MM-dd');
        // Traer todos los horarios disponibles (sin filtrar los ocupados)
        const slotResponse = await fetchAvailableSlots(appointmentDate);
        const { data } = slotResponse;
        console.log('[SOBRETURNO] Paso 5.1: Respuesta de fetchAvailableSlots:', JSON.stringify(data));
        if (data.success) {
            const fechaFormateada = formatearFechaEspanol(data.data.displayDate);
            let message = `📅 *Horarios para sobreturno*\n`;
            message += `📆 Para el día: *${fechaFormateada}*\n\n`;
            const slots: TimeSlot[] = [];
            let morningMessage = '';
            let afternoonMessage = '';
            const availableMorning = data.data.available.morning;
            const availableAfternoon = data.data.available.afternoon;
            console.log('[SOBRETURNO] Paso 5.2: Horarios mañana:', availableMorning, 'tarde:', availableAfternoon);
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
                console.log('[SOBRETURNO] Paso 5.3: No hay horarios disponibles para sobreturno.');
                await flowDynamic('❌ Lo siento, no hay más sobreturnos disponibles para el día solicitado. Te avisaremos pronto si se libera un lugar o agendaremos para el siguiente día hábil.');
                return;
            }
            console.log('[SOBRETURNO] Paso 5.4: Slots disponibles:', slots);
            await state.update({ availableSlots: slots, appointmentDate: format(appointmentDate, 'yyyy-MM-dd') });
            await flowDynamic(message);
        } else {
            console.log('[SOBRETURNO] Paso 5.5: Error al obtener horarios para sobreturno.');
            await flowDynamic('Lo siento, hubo un problema al obtener los horarios para sobreturno. Por favor, intenta nuevamente.');
        }
    })
    .addAnswer('✍️ Por favor, indica el número del horario que deseas para tu sobreturno. Si no deseas continuar, escribe *cancelar*.', { capture: true }, async (ctx, { gotoFlow, flowDynamic, state }) => {
        if (ctx.body.toLowerCase() === 'cancelar') {
            await flowDynamic(`❌ *Solicitud cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!`);
            return gotoFlow(goodbyeFlow);
        }
        const selectedSlotNumber = parseInt(ctx.body);
        const availableSlots = state.get('availableSlots');
        if (isNaN(selectedSlotNumber) || selectedSlotNumber < 1 || selectedSlotNumber > availableSlots.length) {
            await flowDynamic('Número de horario inválido. Por favor, intenta nuevamente.');
            return;
        }
        const selectedSlot = availableSlots[selectedSlotNumber - 1];
        await state.update({ selectedSlot: selectedSlot });
        // Proceder a crear el sobreturno
        try {
            const clientName = state.get('clientName');
            const socialWork = state.get('socialWork');
            const appointmentDate = state.get('appointmentDate');
            const phone = ctx.from;
            const sobreturnoData = {
                clientName,
                socialWork,
                phone: phone,
                date: appointmentDate,
                time: selectedSlot.displayTime,
                email: phone + '@phone.com',
                description: 'Solicitud de sobreturno',
                status: 'pending'
            };
                console.log('[SOBRETURNO] Paso 7: Enviando POST a /sobreturnos con:', sobreturnoData);
            try {
                const response = await axios.post(`${API_URL}/sobreturnos`, sobreturnoData, {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                const data = response.data;
                if (data && (data.success || data._id)) {
                    const fechaFormateada = formatearFechaEspanol(sobreturnoData.date);
                    const message = `✨ *SOLICITUD DE SOBRE TURNO* ✨\n\n` +
                        `✅ Tu sobreturno fue agendado y está *pendiente de confirmación*.\n\n` +
                        `📅 *Fecha:* ${fechaFormateada}\n` +
                        `🕒 *Hora:* ${sobreturnoData.time}\n` +
                        `👤 *Paciente:* ${sobreturnoData.clientName}\n` +
                        `📞 *Teléfono:* ${sobreturnoData.phone}\n` +
                        `🏥 *Obra Social:* ${sobreturnoData.socialWork}\n\n` +
                        `ℹ️ Si tu sobreturno se modifica o cancela, te lo comunicaremos a la brevedad.\n` +
                        `Si no hay más sobreturnos disponibles, te avisaremos pronto y agendaremos para el siguiente día hábil.\n\n` +
                        `*¡Gracias por confiar en nosotros!* 🙏\n` +
                        `----------------------------------`;
                    await flowDynamic(message);
                } else {
                    await flowDynamic('Lo siento, hubo un problema al crear el sobre turno. Por favor, intenta nuevamente.');
                }
            } catch (error) {
                console.error('Error al crear el sobre turno:', error);
                await flowDynamic('Lo siento, ocurrió un error al crear el sobre turno. Por favor, intenta nuevamente más tarde.');
            }
        } catch (error) {
            console.error('Error:', error);
            await flowDynamic('❌ Hubo un error al solicitar el sobre turno. Por favor, intenta nuevamente.');
        }
        return gotoFlow(goodbyeFlow);
    });

// Flujo para mostrar los horarios disponibles
export const availableSlotsFlow = addKeyword(['1', 'horarios', 'disponibles', 'turnos', 'horario'])
    .addAction(async (ctx) => {
        console.log('=== DEPURACIÓN DE ENTRADA ===');
        console.log('Mensaje recibido:', ctx.body);
        console.log('Tipo de mensaje:', typeof ctx.body);
    })
.addAction(async (ctx, { flowDynamic, state }) => {
    try {
        console.log('=== DEBUG SLOTS FLOW ===');
        console.log('1. Iniciando flujo de horarios disponibles');
        console.log('Mensaje recibido:', ctx.body);
        console.log('API URL:', API_URL);
        const timeZone = 'America/Argentina/Buenos_Aires';
        
        const now = new Date();
        const localChatDate = toZonedTime(now, timeZone);
        
        const currentHour = parseInt(format(localChatDate, 'HH'), 10);
        const currentMinute = parseInt(format(localChatDate, 'mm'), 10);
        
        console.log('2. Hora actual:', `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);

        const getNextWorkingDay = (date: Date): Date => {
            const nextDate = new Date(date);
            nextDate.setHours(0, 0, 0, 0);
            
            if (currentHour >= 18) {
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

        // Obtener las citas reservadas antes de mostrar los horarios disponibles
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
            
            // Actualizamos el filtrado de horarios incluyendo la verificación de reservas
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
                await flowDynamic('❌ Lo siento, no hay horarios disponibles para el día solicitado.');
                return;
            }

            await state.update({
                availableSlots: slots,
                appointmentDate: format(appointmentDate, 'yyyy-MM-dd'),
                fullConversationTimestamp: format(localChatDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                conversationStartTime: format(localChatDate, 'HH:mm'),
            });

            await flowDynamic(message);
        } else {
            await flowDynamic('Lo siento, hubo un problema al obtener los horarios disponibles. Por favor, intenta nuevamente.');
        }
    } catch (error) {
        console.error('Error al procesar la respuesta:', error);
        await flowDynamic('Lo siento, ocurrió un error al consultar los horarios. Por favor, intenta nuevamente más tarde.');
    }
})

    .addAnswer('✍️ Por favor, indica el número del horario que deseas para tu sobreturno. Si no deseas continuar, escribe *cancelar*.', { capture: true }, async (ctx, { gotoFlow, flowDynamic, state }) => {
        console.log('[SOBRETURNO] Paso 6: Selección de horario. Mensaje:', ctx.body);
        if (ctx.body.toLowerCase() === 'cancelar') {
            await flowDynamic(`❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!`);
            return;
        }

        const selectedSlotNumber = parseInt(ctx.body);
        const availableSlots = state.get('availableSlots');
        console.log('[SOBRETURNO] Paso 6.1: availableSlots:', availableSlots);
        if (isNaN(selectedSlotNumber) || selectedSlotNumber < 1 || selectedSlotNumber > availableSlots.length) {
            console.log('[SOBRETURNO] Paso 6.2: Número de horario inválido:', ctx.body);
            await flowDynamic('Número de horario inválido. Por favor, intenta nuevamente.');
            return;
        }
        const selectedSlot = availableSlots[selectedSlotNumber - 1];
        console.log('[SOBRETURNO] Paso 6.3: Slot seleccionado:', selectedSlot);
        await state.update({ selectedSlot: selectedSlot });
        // Proceder a crear el sobreturno (el resto del flujo sigue igual)
    });

// Flujo para construir una cita
// export const bookAppointmentFlow = addKeyword(['2', 'reservar', 'cita', 'agendar'])
//     .addAnswer(
//         'Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
//         { capture: true }
//     )
//     .addAction(async (ctx, { state }) => {
//         const name = ctx.body.trim();
//         await state.update({ clientName: name });
//     })
            // console.log('[SOBRETURNO] Paso 7: Enviando POST a /sobreturnos con:', sobreturnoData);
//     .addAnswer(
//         '*Por favor*, selecciona tu *OBRA SOCIAL* de la siguiente lista:\n\n' +
//         '1️⃣ INSSSEP\n' +
//         '2️⃣ Swiss Medical\n' +
//         '3️⃣ OSDE\n' +
//         '4️⃣ Galeno\n' +
//         '5️⃣ CONSULTA PARTICULAR',
                // console.log('[SOBRETURNO] Paso 7.1: Respuesta del backend:', data);
//         { capture: true }
//     )
//     .addAction(async (ctx, { state }) => {
//         const socialWorkOption = ctx.body.trim();
//         const socialWorks = {
//             '1': 'INSSSEP',
//             '2': 'Swiss Medical',
//             '3': 'OSDE',
//             '4': 'Galeno',
//             '5': 'CONSULTA PARTICULAR',
//             '6': 'CONSULTA PARTICULAR',
//             '7': 'CONSULTA PARTICULAR',
//             '8': 'CONSULTA PARTICULAR',
//             '9': 'CONSULTA PARTICULAR',
//         };
                    // console.log('[SOBRETURNO] Paso 7.2: Error en la respuesta del backend al crear sobreturno.');

//         const socialWork = socialWorks[socialWorkOption] || 'CONSULTA PARTICULAR';
//         await state.update({ socialWork });
                // console.error('[SOBRETURNO] Paso 7.3: Error al crear el sobre turno:', error);
//     })
//     .addAnswer(
//         '*Vamos a proceder con la reserva de tu cita.*',
            // console.error('[SOBRETURNO] Paso 8: Error general en la creación del sobreturno:', error);
//     )
//     .addAction(async (ctx, { flowDynamic, state }) => {
//         try {
//             const clientName = state.get('clientName');
//             const socialWork = state.get('socialWork');
//             const selectedSlot = state.get('selectedSlot');
//             const appointmentDate = state.get('appointmentDate');
//             const phone = ctx.from;

//             const appointmentData = {
//                 clientName,
//                 socialWork,
//                 phone: phone,
//                 date: appointmentDate,
//                 time: selectedSlot.displayTime,
//                 email: phone + '@phone.com',
//                 description: 'Reserva de cita'
//             };

//             try {
//                 const response = await axios.post(`${API_URL}/appointments`, appointmentData, {
//                     headers: {
//                         'Content-Type': 'application/json',
//                     }
//                 });

//                 const data = response.data;

//                 if (data.success) {
//                     const fechaFormateada = formatearFechaEspanol(data.data.date);
//                     const message = `✨ *CONFIRMACIÓN DE CITA MÉDICA* ✨\n\n` +
//                         `✅ La cita ha sido agendada exitosamente\n\n` +
//                         `📅 *Fecha:* ${fechaFormateada}\n` +
//                         `🕒 *Hora:* ${data.data.time}\n` +
//                         `👤 *Paciente:* ${data.data.clientName}\n` +
//                         `📞 *Teléfono:* ${data.data.phone}\n` +
//                         `🏥 *Obra Social:* ${data.data.socialWork}\n\n` +
//                         `ℹ️ *Información importante:*\n` +
//                         `- Por favor, llegue 10 minutos antes de su cita\n` +
//                         `- Traiga su documento de identidad\n` +
//                         `- Traiga su carnet de obra social\n\n` +
//                         `📌 *Para cambios o cancelaciones:*\n` +
//                         `Por favor contáctenos con anticipación\n\n` +
//                         `*¡Gracias por confiar en nosotros!* 🙏\n` +
//                         `----------------------------------`;
//                     await flowDynamic(message);
//                 } else {
//                     await flowDynamic('Lo siento, hubo un problema al crear la cita. Por favor, intenta nuevamente.');
//                 }
//             } catch (error) {
//                 console.error('Error al crear la cita:', error);
//                 await flowDynamic('Lo siento, ocurrió un error al crear la cita. Por favor, intenta nuevamente más tarde.');
//             }
//         } catch (error) {
//             console.error('Error:', error);
//             await flowDynamic('❌ Hubo un error al agendar la cita. Por favor, intenta nuevamente.');
//         }
//     })
//     .addAction(async (ctx, ctxFn) => {
//         await ctxFn.gotoFlow(goodbyeFlow);
//     });
//Flujo de despedida
export const goodbyeFlow = addKeyword(['bye', 'adiós', 'chao', 'chau'])
    .addAnswer(
        `👋 *¡Hasta luego! Si necesitas más ayuda, no dudes en contactarnos nuevamente.*`,
        { delay: 1000 }
    )
    // .addAction(async (ctx, ctxFn) => {
    //     await ctxFn.gotoFlow(welcomeFlow);
    // });



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

// Flujo de bienvenida
const welcomeKeywords = ['hi', 'hello', 'hola', "buenas", "buenos días", "buenas tardes", "buenas noches", "ho", "hola ", "ola", "ola ", "hi", "ole"].map(saludo => saludo.toLowerCase()) as [string, ...string[]];

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
        await flowDynamic(`🤖🩺 *¡Bienvenido al Asistente Virtual del Consultorio Médico!* 🩺`);
        await flowDynamic([
            'Puedo ayudarte con las siguientes opciones:',
            '',
            '1️⃣ *horarios* - Ver horarios disponibles para citas',
            '2️⃣ *sobreturno* - Solicitar un sobre turno',
            '',
            '¿En qué puedo ayudarte hoy?'
        ].join('\n'));
    });

const main = async () => {
    const adapterFlow = createFlow([
        welcomeFlow,
        availableSlotsFlow,
        goodbyeFlow,
        adminFlow,
        bookSobreturnoFlow,
    ])
    
    const adapterProvider = createProvider(Provider)
        const adapterDB = new Database({
        dbUri: process.env.MONGO_DB_URI,
        dbName: process.env.MONGO_DB_NAME,
    })

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

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

    httpServer(+PORT)
}

main();