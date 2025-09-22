import { addKeyword } from '@builderbot/bot'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { APP_CONFIG } from '../config/app'
import { formatearFechaEspanol } from '../utils/dateFormatter'
import sobreturnoService, { SobreturnoResponse } from '../utils/sobreturnoService'

interface DisponibleItem {
    sobreturnoNumber: number;
    time: string;
    status?: string;
}

// Flujo para sobreturnos
export const bookSobreturnoFlow = addKeyword(['sobreturnos'])
    .addAnswer(
        '🏥 *SOLICITUD DE SOBRETURNO*\n\n' +
        'Has solicitado un *sobreturno*. Para continuar, necesito algunos datos.\n\n' +
        'Por favor, indícame tu *NOMBRE* y *APELLIDO* (ej: Juan Pérez):',
        { capture: true },
        async (ctx, { state, flowDynamic }) => {
            const name = ctx.body.trim();
            
            // Validaciones estrictas del nombre
            if (!name || name.length < 4) {
                await flowDynamic('❌ El nombre es demasiado corto. Por favor, ingresa tu nombre completo.');
                await state.update({ invalidName: true });
                return;
            }

            // Limpiar y normalizar el nombre
            const cleanName = name.trim().replace(/\s+/g, ' ');
            
            // Verificar que solo contenga letras y espacios
            if (!/^[A-Za-záéíóúñÁÉÍÓÚÑ\s]+$/.test(cleanName)) {
                await flowDynamic('❌ El nombre solo debe contener letras (sin números ni caracteres especiales).');
                await state.update({ invalidName: true });
                return;
            }

            // Verificar que contenga al menos dos palabras (nombre y apellido)
            const words = cleanName.split(' ').filter(word => word.length > 1);
            if (words.length < 2) {
                await flowDynamic('❌ Por favor, ingresa tanto tu nombre como tu apellido separados por un espacio.');
                await state.update({ invalidName: true });
                return;
            }

            // Verificar longitud mínima de cada palabra
            if (words.some(word => word.length < 2)) {
                await flowDynamic('❌ Cada parte del nombre debe tener al menos 2 letras.');
                await state.update({ invalidName: true });
                return;
            }

            await state.update({ 
                clientName: words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
                invalidName: false 
            });
            
            await flowDynamic(`✅ Gracias, ${words[0]}!`);
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
        '_Responde con el número correspondiente (1-6):_',
        { capture: true },
        async (ctx, { state, flowDynamic }) => {
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
                const timeZone = APP_CONFIG.TIMEZONE;
                const now = new Date();
                const localChatDate = toZonedTime(now, timeZone);

                const appointmentDate = formatearFechaEspanol(localChatDate);
                const formattedDate = format(localChatDate, 'yyyy-MM-dd');

                console.log('[SOBRETURNO FLOW] Consultando disponibilidad para:', formattedDate);
                
                // Obtener sobreturnos disponibles usando el servicio mejorado
                const response = await sobreturnoService.getAvailableSobreturnos(formattedDate);
                
                if (response.error) {
                    console.error('[SOBRETURNO FLOW] Error al obtener sobreturnos:', response.message);
                    await flowDynamic('❌ Lo siento, hay un problema al consultar los sobreturnos disponibles. Por favor, intenta más tarde.');
                    return;
                }

                if (!response.data?.data) {
                    throw new Error('No se recibieron datos válidos del servidor');
                }

                const disponibles = response.data.data;
                console.log('[SOBRETURNO FLOW] Sobreturnos disponibles:', disponibles);

                // Eliminar duplicados y validar campos necesarios
                const sobreturnos = [...new Map(disponibles.map((s: DisponibleItem) => [s.sobreturnoNumber, s])).values()]
                    .filter((s: DisponibleItem) => 
                        s.sobreturnoNumber && 
                        s.time && 
                        (s.sobreturnoNumber >= 1 && s.sobreturnoNumber <= 10) &&
                        !s.status // Solo incluir los no reservados
                    )
                    .sort((a: DisponibleItem, b: DisponibleItem) => a.sobreturnoNumber - b.sobreturnoNumber);

                console.log('[SOBRETURNO FLOW] Sobreturnos después de filtrar:', sobreturnos);

                const disponiblesManiana = sobreturnos.filter((s: DisponibleItem) => s.sobreturnoNumber <= 5);
                const disponiblesTarde = sobreturnos.filter((s: DisponibleItem) => s.sobreturnoNumber > 5);
                
                // Guardar en el estado para su uso posterior
                await state.update({
                    appointmentDate: formattedDate,
                    availableSobreturnos: sobreturnos,
                    lastCheck: Date.now()
                });

                let message = `📅 *SOBRETURNOS DISPONIBLES PARA HOY*\n`;
                message += `📆 *Fecha:* ${appointmentDate}\n\n`;

                // Verificar si hay sobreturnos disponibles
                if (disponiblesManiana.length === 0 && disponiblesTarde.length === 0) {
                    const noDisponiblesMsg = '❌ Lo siento, no hay sobreturnos disponibles para hoy.\n\n' +
                        'Puedes:\n' +
                        '1️⃣ Intentar más tarde\n' +
                        '2️⃣ Solicitar un turno normal escribiendo "turnos"\n' +
                        '3️⃣ Cancelar escribiendo *cancelar*';
                    
                    await flowDynamic(noDisponiblesMsg);
                    return;
                }

                // Construir mensaje de sobreturnos disponibles
                if (disponiblesManiana.length > 0) {
                    message += '🌅 *Sobreturnos de mañana:*\n';
                    disponiblesManiana.forEach((s: DisponibleItem) => {
                        message += `${s.sobreturnoNumber}- Sobreturno ${s.time} hs\n`;
                    });
                    message += '\n';
                }
                
                if (disponiblesTarde.length > 0) {
                    message += '🌇 *Sobreturnos de tarde:*\n';
                    disponiblesTarde.forEach((s: DisponibleItem) => {
                        message += `${s.sobreturnoNumber}- Sobreturno ${s.time} hs\n`;
                    });
                }

                message += '\n📝 Para seleccionar un sobreturno, responde con el número correspondiente';
                message += '\n❌ Para cancelar, escribe *cancelar*';

                // Guardar todos los datos necesarios en el estado
                await state.update({
                    appointmentDate: formattedDate,
                    disponiblesManiana,
                    disponiblesTarde,
                    lastRefresh: Date.now(),
                    sobreturnos: {
                        disponibles: [...disponiblesManiana, ...disponiblesTarde].map((s: DisponibleItem) => s.sobreturnoNumber)
                    }
                });

                await flowDynamic(message);
            } catch (error) {
                console.error('[SOBRETURNO] Error en paso 3:', error);
                
                // Manejar diferentes tipos de errores
                let errorMessage = '❌ ';
                
                if (error.message?.includes('conexión')) {
                    errorMessage += 'No pude conectarme al sistema. Por favor, verifica tu conexión a internet e intenta nuevamente.';
                } else if (error.message?.includes('inválido')) {
                    errorMessage += 'El horario seleccionado no es válido. Por favor, elige otro horario disponible.';
                } else if (error.response?.status === 409) {
                    errorMessage += 'Este sobreturno ya ha sido reservado. Voy a actualizar la lista de disponibles.';
                    // Limpiar cache para forzar nueva consulta
                    await state.update({ lastCheck: 0 });
                } else if (error.response?.status === 400) {
                    errorMessage += 'Los datos ingresados no son válidos. Por favor, verifica la información e intenta nuevamente.';
                } else {
                    errorMessage += 'Ocurrió un error inesperado. Por favor, intenta nuevamente más tarde.';
                }
                
                await flowDynamic(errorMessage);
                
                // Solo limpiar el estado si es un error fatal
                if (!error.response || error.response.status >= 500) {
                    await state.clear();
                }
                
                console.log('[SOBRETURNO] Detalles del error:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
            }
        }
    )
    // ... Resto del flujo de sobreturnos
;