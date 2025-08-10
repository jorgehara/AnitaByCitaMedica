import axios from 'axios';
const API_URL = process.env.API_URL || 'https://micitamedica.me/api';

// Configuración global de axios
const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30 segundos de timeout
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
});

// Función de reintento
async function retryRequest(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            console.log(`Intento ${i + 1} fallido. Motivo: ${error.code || error.message}`);
            
            // Si es un error de timeout o de conexión, esperar más tiempo
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                const waitTime = 5000 * Math.pow(2, i); // Empezar con 5s, luego 10s, 20s
                console.log(`Esperando ${waitTime/1000} segundos antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else if (i < maxRetries - 1) {
                const waitTime = 1000 * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    if (lastError?.code === 'ECONNABORTED' || lastError?.code === 'ETIMEDOUT') {
        console.error('Error de conexión: El servidor está tardando en responder');
        return { error: 'timeout', message: 'El servidor está tardando en responder. Por favor, inténtalo de nuevo más tarde.' };
    }
    
    throw lastError;
}

export { axiosInstance, retryRequest };
