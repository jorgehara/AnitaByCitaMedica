import { config } from 'dotenv';
config();

export const APP_CONFIG = {
    // Configuración de la API
    API_URL: process.env.API_URL || 'https://micitamedica.me/api',
    PORT: process.env.PORT || 3008,
    
    // Configuración de MongoDB
    MONGO_DB_URI: process.env.MONGO_DB_URI || 'mongodb://localhost:27017/consultorio',
    MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'consultorio',
    
    // Configuración de horarios de trabajo
    BUSINESS_HOURS: {
        start: 8, // Hora de inicio (8 AM)
        end: 18,  // Hora de fin (6 PM)
        breakStart: 13, // Inicio del descanso (1 PM)
        breakEnd: 14,   // Fin del descanso (2 PM)
    },

    // Configuración de obras sociales
    SOCIAL_WORKS: {
        '1': 'INSSSEP',
        '2': 'Swiss Medical',
        '3': 'OSDE',
        '4': 'Galeno',
        '5': 'CONSULTA PARTICULAR'
    },

    // Configuración de mensajes
    MESSAGES: {
        WELCOME: '👨‍⚕️ *Bienvenido al Sistema de Citas Médicas* 🏥',
        UNAVAILABLE: '❌ Lo siento, no hay horarios disponibles para el día solicitado.',
        ERROR: '❌ Ha ocurrido un error. Por favor, intenta nuevamente más tarde.',
        SUCCESS: '✅ Tu cita ha sido agendada exitosamente.',
        INSTRUCTIONS: [
            '📋 *Instrucciones importantes:*',
            '- Llegue 10 minutos antes de su cita',
            '- Traiga su documento de identidad',
            '- Traiga su carnet de obra social'
        ].join('\n')
    },

    // Configuración de zona horaria
    TIMEZONE: 'America/Argentina/Buenos_Aires',
    
    // Admin settings
    ADMIN_NUMBER: process.env.ADMIN_NUMBER || ''
};

export default APP_CONFIG;
