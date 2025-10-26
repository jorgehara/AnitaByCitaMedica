/**
 * Sistema de Control del Bot
 * Este módulo permite gestionar el estado del bot y las conversaciones
 * de una manera simple y efectiva.
 */

/**
 * Verifica si el bot está activo globalmente
 * @param ctx - Contexto del mensaje
 * @param ctxFn - Funciones del contexto
 * @returns true si el bot está activo, false si está desactivado
 */
const isActive = async (ctx: any, ctxFn: any): Promise<boolean> => {
    // Obtener el estado global del bot
    const estado = await ctxFn.globalState.getMyState();
    // Si no existe la propiedad 'encendido', por defecto es true
    return estado.encendido ?? true;
}

/**
 * Activa o desactiva el bot completamente
 * Ejemplo de uso: await toogleActiveBot(ctx, ctxFn);
 */
const toogleActiveBot = async (ctx: any, ctxFn: any) => {
    const botActivo = await isActive(ctx, ctxFn);
    
    if (botActivo) {
        // Si está activo, lo desactivamos
        await ctxFn.globalState.update({ encendido: false });
        return ctxFn.flowDynamic("🔴 Bot desactivado");
    } else {
        // Si está desactivado, lo activamos
        await ctxFn.globalState.update({ encendido: true });
        return ctxFn.flowDynamic("🟢 Bot activado");
    }
}

/**
 * Verifica si una conversación específica está activa
 * Una conversación se considera inactiva si:
 * 1. Está en la lista de conversaciones desactivadas
 * 2. No han pasado más de 48 horas desde su desactivación
 */
const isConvActive = async (numero: string, ctxFn: any): Promise<boolean> => {
    const estado = await ctxFn.globalState.getMyState();
    const conversacionesDesactivadas = estado.convOff ?? {};

    // Si el número está en la lista de desactivados
    if (conversacionesDesactivadas[numero]) {
        const fechaDesactivacion = new Date(conversacionesDesactivadas[numero]);
        const ahora = new Date();
        const horasTranscurridas = (ahora.getTime() - fechaDesactivacion.getTime()) / (1000 * 60 * 60);

        // La conversación se reactiva automáticamente después de 48 horas
        return horasTranscurridas >= 48;
    }

    // Si el número no está en la lista, la conversación está activa
    return true;
}

/**
 * Activa o desactiva una conversación específica
 * Ejemplo de uso: await toggleActive(número_teléfono, ctxFn);
 */
const toggleActive = async (numero: string, ctxFn: any): Promise<boolean> => {
    const estado = await ctxFn.globalState.getMyState();
    const conversacionesDesactivadas = estado.convOff ?? {};
    const estaActiva = await isConvActive(numero, ctxFn);

    if (estaActiva) {
        // Desactivar la conversación
        conversacionesDesactivadas[numero] = new Date().toISOString();
        await ctxFn.flowDynamic("🔴 Conversación desactivada por 48 horas");
    } else {
        // Reactivar la conversación
        delete conversacionesDesactivadas[numero];
        await ctxFn.flowDynamic("🟢 Conversación reactivada");
    }

    // Guardar cambios
    await ctxFn.globalState.update({ convOff: conversacionesDesactivadas });
    return !estaActiva;
}

/**
 * Obtiene la lista de conversaciones desactivadas y su tiempo restante
 * Útil para monitorear qué conversaciones están pausadas
 */
const listarConversacionesDesactivadas = async (ctxFn: any): Promise<[string, string][]> => {
    const estado = await ctxFn.globalState.getMyState();
    const conversacionesDesactivadas = estado.convOff ?? {};
    const resultado = [];

    for (const numero in conversacionesDesactivadas) {
        const fechaDesactivacion = new Date(conversacionesDesactivadas[numero]);
        const ahora = new Date();
        const tiempoRestante = 48 * 60 * 60 * 1000 - (ahora.getTime() - fechaDesactivacion.getTime());

        if (tiempoRestante > 0) {
            const horas = Math.floor(tiempoRestante / (1000 * 60 * 60));
            const minutos = Math.floor((tiempoRestante % (1000 * 60 * 60)) / (1000 * 60));
            resultado.push([
                numero, 
                `⏳ Tiempo restante: ${horas}h ${minutos}m`
            ]);
        } else {
            // Limpiar conversaciones que ya deberían estar activas
            delete conversacionesDesactivadas[numero];
        }
    }

    // Actualizar estado si se eliminaron conversaciones
    await ctxFn.globalState.update({ convOff: conversacionesDesactivadas });
    return resultado;
}

// Exportar todas las funciones
export {
    isActive,
    isConvActive,
    toggleActive,
    toogleActiveBot,
    listarConversacionesDesactivadas as conversationsOff
}

/**
 * GUÍA DE USO RÁPIDO:
 * 
 * 1. Activar/Desactivar el bot completo:
 *    await toogleActiveBot(ctx, ctxFn);
 * 
 * 2. Desactivar una conversación específica:
 *    await toggleActive('123456789', ctxFn);
 * 
 * 3. Verificar si una conversación está activa:
 *    const activa = await isConvActive('123456789', ctxFn);
 * 
 * 4. Ver lista de conversaciones desactivadas:
 *    const lista = await conversationsOff(ctxFn);
 *    lista.forEach(([numero, tiempo]) => {
 *        console.log(`${numero}: ${tiempo}`);
 *    });
 * 
 * IMPORTANTE:
 * - Las conversaciones se reactivan automáticamente después de 48 horas
 * - El estado del bot se guarda globalmente
 * - Usa estos controles con precaución
 */