import { addKeyword } from '@builderbot/bot';

export const sobreturnoFlow = addKeyword(['sobreturno', 'sobreturnos'])
    .addAction(async (ctx, { flowDynamic }) => {
        // Mostrar 5 sobreturnos para la mañana y 5 para la tarde
        let message = '🏥 *Sobreturnos disponibles hoy:*\n\n';
        message += '� *Sobreturnos de mañana:*\n';
        for (let i = 1; i <= 5; i++) {
            message += `Sobreturno ${i}\n`;
        }
        message += '\n🌇 *Sobreturnos de tarde:*\n';
        for (let i = 6; i <= 10; i++) {
            message += `Sobreturno ${i}\n`;
        }
        await flowDynamic(message);
    });
