import { addKeyword } from '@builderbot/bot';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import appointmentService from '../utils/appointmentService';
import { formatearFechaEspanol } from '~/utils/dateFormatter';

interface TimeSlot {
    displayTime: string;
    time: string;
    status: 'available' | 'unavailable';
}

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
            
            const timeZone = 'America/Argentina/Buenos_Aires';
            const now = new Date();
            const localChatDate = toZonedTime(now, timeZone);
            
            const currentHour = parseInt(format(localChatDate, 'HH'), 10);
            const currentMinute = parseInt(format(localChatDate, 'mm'), 10);
            
            console.log('2. Hora actual:', `${currentHour}:${currentMinute}`);

            // Obtener el próximo día hábil
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

            // Obtener slots disponibles usando el nuevo servicio
            const availableSlots = await appointmentService.getAvailableSlots(formattedDate);
            
            const fechaFormateada = formatearFechaEspanol(formattedDate);
            let message = `📅 *Horarios disponibles*\n`;
            message += `📆 Para el día: *${fechaFormateada}*\n\n`;

            // Filtrar y organizar los slots
            const morningSlots = availableSlots.filter(slot => {
                const [hour] = slot.time.split(':').map(Number);
                return hour < 12 && slot.status === 'available';
            });

            const afternoonSlots = availableSlots.filter(slot => {
                const [hour] = slot.time.split(':').map(Number);
                return hour >= 12 && slot.status === 'available';
            });

            // Formatear mensaje de la mañana
            if (morningSlots.length > 0) {
                message += '*🌅 Horarios de mañana:*\n';
                morningSlots.forEach((slot, index) => {
                    message += `${index + 1}. ⏰ ${slot.displayTime}\n`;
                });
                message += '\n';
            }

            // Formatear mensaje de la tarde
            if (afternoonSlots.length > 0) {
                message += '*🌇 Horarios de tarde:*\n';
                afternoonSlots.forEach((slot, index) => {
                    message += `${morningSlots.length + index + 1}. ⏰ ${slot.displayTime}\n`;
                });
            }

            if (morningSlots.length === 0 && afternoonSlots.length === 0) {
                await flowDynamic('Lo siento, no hay horarios disponibles para el día seleccionado.');
                return;
            }

            // Guardar los slots en el estado para su uso posterior
            await state.update({ 
                appointmentDate: formattedDate,
                availableSlots: [...morningSlots, ...afternoonSlots]
            });

            await flowDynamic(message);
        } catch (error) {
            console.error('Error en el flujo de horarios:', error);
            await flowDynamic('Lo siento, ocurrió un error al consultar los horarios. Por favor, intenta nuevamente más tarde.');
        }
    })
    .addAnswer('✍️ Por favor, indica el número del horario que deseas reservar. Si no deseas reservar, escribe *cancelar*.', 
        { capture: true }, 
        async (ctx, { gotoFlow, flowDynamic, state }) => {
            // Lógica de reserva aquí
        }
    );
