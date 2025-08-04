import { addKeyword } from '@builderbot/bot';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import axios from 'axios';
import { APPOINTMENT_CONFIG } from '../config/appointment';

const { API_URL, TIMEZONE, MESSAGES, SOCIAL_WORKS } = APPOINTMENT_CONFIG;

interface TimeSlot {
    displayTime: string;
    time: string;
    status: 'available' | 'unavailable';
}

interface AppointmentResponse {
    time: string;
    [key: string]: any;
}

interface SocialWorkOption {
    [key: string]: string;
}

type AvailableSlot = {
    displayTime: string;
    time: string;
    status: 'available' | 'unavailable';
}

async function fetchAvailableSlots(date: Date) {
    try {
        const formattedDate = format(date, 'yyyy-MM-dd');
        const response = await axios.get(`${API_URL}/appointments/available/${formattedDate}`, {
            headers: { 'Accept': 'application/json' }
        });
        return { data: response.data };
    } catch (error) {
        console.error('Error al obtener slots disponibles:', error);
        throw error;
    }
}

async function getReservedAppointments(date: string): Promise<string[]> {
    try {
        const response = await axios.get(`${API_URL}/appointments/reserved/${date}`);
        if (response.data.success) {
            return response.data.data.map((appointment: AppointmentResponse) => appointment.time);
        }
        return [];
    } catch (error) {
        console.error('Error al obtener citas reservadas:', error);
        return [];
    }
}



export const appointmentFlow = addKeyword(['1', 'turno', 'turnos', 'cita', 'citas'])    
    .addAction(async (ctx, { flowDynamic, state }) => {
        try {
            const timeZone = 'America/Argentina/Buenos_Aires';
            const now = new Date();
            const localChatDate = toZonedTime(now, timeZone);
            
            const currentHour = parseInt(format(localChatDate, 'HH'), 10);
            const currentMinute = parseInt(format(localChatDate, 'mm'), 10);

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
            const reservedTimes = await getReservedAppointments(formattedDate);
            
            const slotResponse = await fetchAvailableSlots(appointmentDate);
            const { data } = slotResponse;

            if (data.success) {
                const fechaFormateada = format(
                    toZonedTime(new Date(data.data.displayDate), timeZone),
                    "EEEE dd 'de' MMMM 'de' yyyy",
                    { locale: es }
                );

                let message = `📅 *Horarios disponibles*\n`;
                message += `📆 Para el día: *${fechaFormateada}*\n\n`;
                
                const slots: TimeSlot[] = [];
                let morningMessage = '';
                let afternoonMessage = '';

                if (data.data.available.morning.length > 0) {
                    morningMessage = `*🌅 Horarios de mañana:*\n`;
                    data.data.available.morning
                        .filter((slot: AvailableSlot) => !reservedTimes.includes(slot.displayTime))
                        .forEach((slot: AvailableSlot) => {
                            slots.push(slot);
                            morningMessage += `${slots.length}. ⏰ ${slot.displayTime}\n`;
                        });
                    message += morningMessage + '\n';
                }

                if (data.data.available.afternoon.length > 0) {
                    afternoonMessage = `*🌇 Horarios de tarde:*\n`;
                    data.data.available.afternoon
                        .filter((slot: AvailableSlot) => !reservedTimes.includes(slot.displayTime))
                        .forEach((slot: AvailableSlot) => {
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
                    appointmentDate: formattedDate
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
    .addAnswer(
        '✍️ Por favor, indica el número del horario que deseas reservar. Si no deseas reservar, escribe *cancelar*.',
        { capture: true },
        async (ctx, { flowDynamic, state, endFlow }) => {
            if (ctx.body.toLowerCase() === 'cancelar') {
                await flowDynamic('❌ *Reserva cancelada.* Si necesitas más ayuda, no dudes en contactarnos nuevamente.\n🤗 ¡Que tengas un excelente día!');
                return endFlow();
            }

            const selectedSlotNumber = parseInt(ctx.body);
            const availableSlots = state.get('availableSlots');

            if (isNaN(selectedSlotNumber) || selectedSlotNumber < 1 || selectedSlotNumber > availableSlots.length) {
                await flowDynamic('Número de horario inválido. Por favor, intenta nuevamente.');
                return;
            }

            const selectedSlot = availableSlots[selectedSlotNumber - 1];
            await state.update({ selectedSlot });
        }
    )
    .addAnswer(
        'Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
        { capture: true },
        async (ctx, { state }) => {
            const name = ctx.body.trim();
            await state.update({ clientName: name });
        }
    )
    .addAnswer(
        ['*Por favor*, selecciona tu *OBRA SOCIAL* de la siguiente lista:',
         '',
         '1️⃣ INSSSEP',
         '2️⃣ Swiss Medical',
         '3️⃣ OSDE',
         '4️⃣ Galeno',
         '5️⃣ CONSULTA PARTICULAR'].join('\n'),
        { capture: true },
        async (ctx, { state }) => {
            const socialWorkOption = ctx.body.trim();
            const socialWork = SOCIAL_WORKS[socialWorkOption as keyof typeof SOCIAL_WORKS] || 'CONSULTA PARTICULAR';
            await state.update({ socialWork });
        }
    )
    .addAnswer(
        '*Vamos a proceder con la reserva de tu cita.*',
        { delay: 1000 }
    )
    .addAction(async (ctx, { flowDynamic, state }) => {
        try {
            const clientName = state.get('clientName');
            const socialWork = state.get('socialWork');
            const selectedSlot = state.get('selectedSlot');
            const appointmentDate = state.get('appointmentDate');
            const phone = ctx.from;

            const appointmentData = {
                clientName,
                socialWork,
                phone,
                date: appointmentDate,
                time: selectedSlot.displayTime,
                email: `${phone}@phone.com`,
                description: 'Reserva de cita'
            };

            const response = await axios.post(`${API_URL}/appointments`, appointmentData, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.success) {
                const fechaFormateada = format(
                    toZonedTime(new Date(response.data.data.date), 'America/Argentina/Buenos_Aires'),
                    "EEEE dd 'de' MMMM 'de' yyyy",
                    { locale: es }
                );

                const message = [
                    '✨ *CONFIRMACIÓN DE CITA MÉDICA* ✨\n',
                    '✅ La cita ha sido agendada exitosamente\n',
                    `📅 *Fecha:* ${fechaFormateada}`,
                    `🕒 *Hora:* ${response.data.data.time}`,
                    `👤 *Paciente:* ${response.data.data.clientName}`,
                    `📞 *Teléfono:* ${response.data.data.phone}`,
                    `🏥 *Obra Social:* ${response.data.data.socialWork}\n`,
                    'ℹ️ *Información importante:*',
                    '- Por favor, llegue 10 minutos antes de su cita',
                    '- Traiga su documento de identidad',
                    '- Traiga su carnet de obra social\n',
                    '📌 *Para cambios o cancelaciones:*',
                    'Por favor contáctenos con anticipación\n',
                    '*¡Gracias por confiar en nosotros!* 🙏',
                    '----------------------------------'
                ].join('\n');

                await flowDynamic(message);
            } else {
                await flowDynamic('Lo siento, hubo un problema al crear la cita. Por favor, intenta nuevamente.');
            }
        } catch (error) {
            console.error('Error al crear la cita:', error);
            await flowDynamic('Lo siento, ocurrió un error al crear la cita. Por favor, intenta nuevamente más tarde.');
        }
    });

export default appointmentFlow;
