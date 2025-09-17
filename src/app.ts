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
import { APP_CONFIG } from './config/app';

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

const API_URL = APP_CONFIG.API_URL;
console.log('API URL configurada:', API_URL);

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

import appointmentService from './utils/appointmentService';

// Función para obtener las citas reservadas usando el nuevo servicio
async function getReservedAppointments(date: string): Promise<string[]> {
    return appointmentService.getReservedSlots(date);
}

// Función para crear una cita médica
async function createAppointment(appointmentData: AppointmentData): Promise<APIResponseWrapper> {
    return appointmentService.createAppointment(appointmentData);
}

//Flujo de sobreturnos - SOLO se activa con la palabra "sobreturno"
export const bookSobreturnoFlow = addKeyword(['sobreturnos'])
    .addAnswer(
        '🏥 *SOLICITUD DE SOBRETURNO*\n\n' +
        'Has solicitado un *sobreturno*. Para continuar, necesito algunos datos.\n\n' +
        'Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
        { capture: true },
        async (ctx, { state }) => {
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
        '5️⃣ CONSULTA PARTICULAR\n\n' +
        '_Responde con el número correspondiente (1, 2, 3, 4 o 5):_',
        { capture: true },
        async (ctx, { state, flowDynamic }) => {
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
                '5': 'CONSULTA PARTICULAR'
            };
            
            const socialWork = socialWorks[socialWorkOption];
            
            if (!socialWork) {
                await flowDynamic('❌ Opción inválida. Por favor, selecciona un número del 1 al 5.');
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

                // Mostrar 5 sobreturnos para la mañana y 5 para la tarde
                let message = `📅 *SOBRETURNOS DISPONIBLES PARA HOY*\n`;
                message += `📆 *Fecha:* ${fechaFormateada}\n\n`;
                message += '🌅 *Sobreturnos de mañana:*\n';
                for (let i = 1; i <= 5; i++) {
                    message += `${i}- Sobreturno ${i}\n`;
                }
                message += '\n🌇 *Sobreturnos de tarde:*\n';
                for (let i = 6; i <= 10; i++) {
                    message += `${i}- Sobreturno ${i}\n`;
                }
                message += '\n📝 *Para seleccionar un sobreturno, responde con el número correspondiente (1-10)*';
                message += '\n❌ Para cancelar, escribe *cancelar*';

                // Guardar los ítems en el estado para la selección
                const sobreturnos = Array.from({ length: 10 }, (_, idx) => ({ numero: idx + 1 }));
                await state.update({ availableSobreturnos: sobreturnos, appointmentDate: formattedDate, totalSobreturnos: 10 });

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

                if (!clientName || !socialWork || !appointmentDate || !sobreturnos) {
                    console.error('[SOBRETURNO] Datos faltantes:', { clientName, socialWork, appointmentDate, sobreturnos });
                    await flowDynamic('❌ Faltan datos para procesar el sobreturno. Por favor, inicia nuevamente escribiendo "sobreturno".');
                    await state.clear();
                    return;
                }

                // Mostrar confirmación antes de crear
                await flowDynamic(`⏳ *Procesando tu sobreturno...*\n\n📝 *Resumen:*\n👤 ${clientName}\n🏥 ${socialWork}\n🔢 Sobreturno ${numero}`);


                // Asignar horario fijo según el número de sobreturno
                const sobreturnoHorarios = [
                    '11:00', '11:15', '11:30', '11:45', '12:00',
                    '19:00', '19:15', '19:30', '19:45', '20:00'
                ];
                const horarioAsignado = sobreturnoHorarios[numero - 1];

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
                    const result = await axios.post(`${API_URL}/sobreturnos`, sobreturnoData);
                    if (result.data && result.data._id) {
                        // Confirmación exitosa
                        const confirmationMessage = `✨ *CONFIRMACIÓN DE SOBRETURNO* ✨\n\n` +
                            `✅ *¡Tu sobreturno ha sido agendado exitosamente!*\n\n` +
                            `📅 *Fecha:* ${formatearFechaEspanol(appointmentDate)}\n` +
                            `🔢 *Sobreturno:* ${numero}\n` +
                            // `🕒 *Horario:* ${horarioAsignado}\n`+
                            `👤 *Paciente:* ${clientName}\n` +
                            `📞 *Teléfono:* ${phone}\n` +
                            `🏥 *Obra Social:* ${socialWork}\n\n` +
                            `⚠️ *IMPORTANTE:*\n` +
                            `• Llegue 10 minutos antes\n` +
                            `• Traiga documento de identidad\n` +
                            `• Traiga carnet de obra social\n` +
                            `• El sobreturno depende de la disponibilidad del médico\n\n` +
                            `*¡Gracias por confiar en nosotros!* 🙏`;
                        await flowDynamic(confirmationMessage);
                    } else {
                        await flowDynamic('❌ Ocurrió un error al agendar el sobreturno. Por favor, intenta nuevamente.');
                    }
                } catch (error) {
                    console.error('[SOBRETURNO] Error al enviar al backend:', error);
                    await flowDynamic('❌ Ocurrió un error inesperado al agendar el sobreturno. Por favor, intenta nuevamente más tarde.');
                }
                await state.clear();
                return gotoFlow(goodbyeFlow);

                // Simulación de confirmación
                const confirmationMessage = `✨ *CONFIRMACIÓN DE SOBRETURNO* ✨\n\n` +
                    `✅ *¡Tu sobreturno ha sido agendado exitosamente!*\n\n` +
                    `📅 *Fecha:* ${formatearFechaEspanol(appointmentDate)}\n` +
                    `🔢 *Sobreturno:* ${numero}\n` +
                    `👤 *Paciente:* ${clientName}\n` +
                    `📞 *Teléfono:* ${phone}\n` +
                    `🏥 *Obra Social:* ${socialWork}\n\n` +
                    `⚠️ *IMPORTANTE:*\n` +
                    `• Llegue 10 minutos antes\n` +
                    `• Traiga documento de identidad\n` +
                    `• Traiga carnet de obra social\n` +
                    `• El sobreturno depende de la disponibilidad del médico\n\n` +
                    `*¡Gracias por confiar en nosotros!* 🙏`;

                await flowDynamic(confirmationMessage);
                await state.clear();
                return gotoFlow(goodbyeFlow);
            } catch (error) {
                console.error('[SOBRETURNO] Error al procesar:', error);
                await flowDynamic('❌ Ocurrió un error inesperado. Por favor, intenta nuevamente más tarde.');
                await state.clear();
            }
        }
    );

// Flujo para mostrar los horarios disponibles (citas normales)
export const availableSlotsFlow = addKeyword(['turnos'])
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

    .addAnswer('✍️ Por favor, indica el número del horario que deseas reservar. Si no deseas reservar, escribe *cancelar*.', { capture: true }, async (ctx, { gotoFlow, flowDynamic, state }) => {
        if (ctx.body.toLowerCase() === 'cancelar') {
            await flowDynamic(`❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!`);
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
        
        console.log('=== DEBUG ESTADO ANTES DE DIRIGIR A BOOK APPOINTMENT ===');
        console.log('selectedSlot guardado:', selectedSlot);
        console.log('appointmentDate:', state.get('appointmentDate'));
        
        // Dirigir al flujo de recopilación de datos del cliente
        return gotoFlow(clientDataFlow);
    });

// Flujo para recopilar datos del cliente y crear la cita normal
export const clientDataFlow = addKeyword(['datos_cliente'])
    .addAnswer(
        'Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
        { capture: true }
    )
    .addAction(async (ctx, { state }) => {
        const name = ctx.body.trim();
        await state.update({ clientName: name });
    })
    .addAnswer(
        '*Por favor*, selecciona tu *OBRA SOCIAL* de la siguiente lista:\n\n' +
        '1️⃣ INSSSEP\n' +
        '2️⃣ Swiss Medical\n' +
        '3️⃣ OSDE\n' +
        '4️⃣ Galeno\n' +
        '5️⃣ CONSULTA PARTICULAR',
        { capture: true }
    )
    .addAction(async (ctx, { state }) => {
        const socialWorkOption = ctx.body.trim();
        const socialWorks = {
            '1': 'INSSSEP',
            '2': 'Swiss Medical',
            '3': 'OSDE',
            '4': 'Galeno',
            '5': 'CONSULTA PARTICULAR',
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
            const appointmentDate = state.get('appointmentDate');
            const phone = ctx.from;

            // Validar que todos los datos requeridos están presentes
            if (!clientName || !socialWork || !selectedSlot || !appointmentDate) {
                console.error('Datos faltantes en el estado:', {
                    clientName,
                    socialWork,
                    selectedSlot,
                    appointmentDate
                });
                await flowDynamic('❌ Hubo un problema con los datos de la cita. Por favor, intenta nuevamente desde el inicio.');
                return;
            }

            if (!selectedSlot.displayTime) {
                console.error('selectedSlot no tiene displayTime:', selectedSlot);
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
                    `- Por favor, llegue 10 minutos antes de su cita\n` +
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
        } catch (error) {
            console.error('Error al crear la cita:', error);
            await flowDynamic('❌ Lo siento, ocurrió un error al crear la cita. Por favor, intenta nuevamente más tarde.');
        }
        
        // Limpiar estado y dirigir a goodbyeFlow
        await state.clear();
        return gotoFlow(goodbyeFlow);
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
            '📅 Escribe *"turnos"* - Ver horarios disponibles para citas normales',
            '🏥 Escribe *"sobreturnos"* - Solicitar un sobreturno urgente',
            '',
            '💡 *Información importante:*',
            '• Las citas normales se programan con anticipación',
            '• Los sobreturnos son para atención el mismo día (sujeto a disponibilidad)',
            '• Todas las citas se confirman automáticamente',
            '',
            '¿En qué puedo ayudarte hoy?'
        ].join('\n'));
    });

const main = async () => {
    const adapterFlow = createFlow([
        // Flujos principales
        welcomeFlow,
        bookSobreturnoFlow,  // Se activa únicamente con la palabra "sobreturno"
        availableSlotsFlow,  // Se activa con "horarios", "disponibles", "turnos", "horario"
        clientDataFlow,
        goodbyeFlow,
        adminFlow,
    ])
    
    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database({
        dbUri: APP_CONFIG.MONGO_DB_URI,
        dbName: APP_CONFIG.MONGO_DB_NAME,
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