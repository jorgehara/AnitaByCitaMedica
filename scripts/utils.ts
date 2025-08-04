/* eslint-disable no-prototype-builtins */
//Accedemos desde el cliente con !Help !onoff para pausar el chatbot
//Bot Global esta activo?
const isActive = async (ctx, ctxFn) => {
    const currentGlobalState = await ctxFn.globalState.getMyState();
    currentGlobalState.encendido = currentGlobalState.encendido ?? true;
    return currentGlobalState.encendido
}

//Activar / Desactivar bot
const toogleActiveBot = async (ctx, ctxFn) => {
    if (await isActive(ctx, ctxFn)) {
        await ctxFn.globalState.update({ encendido: false });
        return ctxFn.flowDynamic("Bot desactivado.");
    } else {
        await ctxFn.globalState.update({ encendido: true });
        return ctxFn.flowDynamic("Bot activado.");
    }
}

//Conversación activa
const isConvActive = async (number, ctxFn) => {
    const currentGlobalState = await ctxFn.globalState.getMyState();
    const convOff = currentGlobalState.convOff ?? {};

    if (convOff[number]) {
        const deactivationDate = new Date(convOff[number]);
        const currentDate = new Date();
        const hoursDiff = (currentDate - deactivationDate) / (1000 * 60 * 60);

        // Verificar si la diferencia es mayor a 48 horas
        if (hoursDiff < 48) {
            return false;
        } else {
            return true;
        }
    } else {
        // Si el número no existe en convOff, la conversación está activa
        return true;
    }
}

//Activar / desactivar conversación
const toggleActive = async (number, ctxFn) => {
    const currentGlobalState = await ctxFn.globalState.getMyState();
    const convOff = currentGlobalState.convOff ?? {};
    const isActive = await isConvActive(number, ctxFn);

    if (isActive) {
        // Si está activa, desactivarla
        convOff[number] = new Date().toISOString(); // Guardar la fecha actual en formato ISO
        await ctxFn.flowDynamic("Conversación desactivada.");
    } else {
        // Si está desactivada, activarla
        delete convOff[number]; // Remover el número de convOff
        await ctxFn.flowDynamic("Conversación reactivada.");
    }

    // Actualizar el estado global con el nuevo convOff
    currentGlobalState.convOff = convOff;
    await ctxFn.globalState.update(currentGlobalState);

    return !isActive; // Devolver el nuevo estado
};

const conversationsOff = async (ctxFn: any) => {
    const currentGlobalState = await ctxFn.globalState.getMyState();
    const convOff = currentGlobalState.convOff ?? {};
    const result = [];

    for (const number in convOff) {
        if (convOff.hasOwnProperty(number)) {
            const deactivationDate = new Date(convOff[number]);
            const currentDate = new Date();
            const timeDiff = 48 * 60 * 60 * 1000 - (currentDate - deactivationDate); // Tiempo restante en ms
            if (timeDiff > 0) {
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                result.push([number, `Tiempo restante para reactivarse - ${hours}hs ${minutes}minutos`]);
            } else {
                // El tiempo ya ha pasado, lo removemos
                delete convOff[number];
            }
        }
    }

    // Actualizar el estado global si hemos removido números desactivados
    currentGlobalState.convOff = convOff;
    await ctxFn.globalState.update(currentGlobalState);

    return result;
};

export { isActive, isConvActive, toggleActive, toogleActiveBot, conversationsOff }