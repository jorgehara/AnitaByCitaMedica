// Horarios por defecto cuando no hay conexión
export const defaultAvailableSlots = {
    morning: [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"
    ],
    afternoon: [
        "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
    ]
};

export const getFallbackSlots = (date: string) => {
    const slots = [];
    
    // Convertir los horarios por defecto al formato esperado
    [...defaultAvailableSlots.morning, ...defaultAvailableSlots.afternoon].forEach(time => {
        slots.push({
            displayTime: time,
            time: time,
            status: 'available'
        });
    });

    return {
        success: true,
        data: slots,
        message: "Datos recuperados del sistema de respaldo"
    };
};
