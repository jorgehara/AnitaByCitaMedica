import axios from 'axios';
import { APP_CONFIG } from './app';

const API_URL = APP_CONFIG.API_URL;

// Configuración global de axios
const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 segundos de timeout inicial
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    maxRedirects: 5,
    validateStatus: function (status) {
        return status >= 200 && status < 500; // No rechazar respuestas con estado < 500
    }
});

// Función de reintento
async function retryRequest(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
    let lastError;
    let timeoutMs = 10000; // Empezar con 10 segundos

    for (let i = 0; i < maxRetries; i++) {
        try {
            // Ajustar el timeout de la instancia actual
            axiosInstance.defaults.timeout = timeoutMs;
            return await fn();
        } catch (error: any) {
            lastError = error;
            console.log(`Intento ${i + 1} fallido. Motivo: ${error.code || error.message}`);
            
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                timeoutMs *= 2; // Duplicar el timeout en cada intento
                const waitTime = 3000 * (i + 1); // 3s, 6s, 9s de espera
                console.log(`Esperando ${waitTime/1000} segundos antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else if (i < maxRetries - 1) {
                const waitTime = 1000 * (i + 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // Si todos los intentos fallan, devolver el sistema de respaldo
    if (lastError?.code === 'ECONNABORTED' || lastError?.code === 'ETIMEDOUT') {
        console.error('Error de conexión: El servidor está tardando en responder');
        return { error: true, message: 'timeout', data: null };
    }
    
    throw lastError;
}
    

export { axiosInstance, retryRequest };
