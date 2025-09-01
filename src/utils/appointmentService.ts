import { axiosInstance } from '../config/axios';
import cache from './cache';
import { getFallbackSlots } from './fallbackData';

interface AppointmentSlot {
    displayTime: string;
    time: string;
    status: 'available' | 'unavailable';
}

class AppointmentService {
    private static instance: AppointmentService;
    private isOnline: boolean = true;

    private constructor() {}

    public static getInstance(): AppointmentService {
        if (!AppointmentService.instance) {
            AppointmentService.instance = new AppointmentService();
        }
        return AppointmentService.instance;
    }

    private getCacheKey(date: string): string {
        return `appointments_${date}`;
    }

    async getAvailableSlots(date: string): Promise<AppointmentSlot[]> {
        console.log('=== DEBUG FETCH SLOTS ===');
        console.log(`9. Consultando slots disponibles para: ${date}`);

        // 1. Intentar obtener del caché
        const cachedData = cache.get<AppointmentSlot[]>(this.getCacheKey(date));
        if (cachedData) {
            console.log('Usando datos en caché');
            return cachedData;
        }

        // 2. Si no hay caché, intentar obtener del servidor
        try {
            // Verificar conectividad con un endpoint ligero
            await this.checkConnectivity();

            if (!this.isOnline) {
                console.log('Sistema offline. Usando sistema de respaldo');
                const fallbackData = getFallbackSlots(date);
                return fallbackData.data;
            }

            const response = await axiosInstance.get(`/appointments/available/${date}`);
            const slots = response.data.data;
            
            // Guardar en caché
            cache.set(this.getCacheKey(date), slots);
            
            return slots;
        } catch (error: any) {
            console.error('Error al obtener slots:', error.message);
            
            // Si hay un error, marcar como offline y usar sistema de respaldo
            this.isOnline = false;
            const fallbackData = getFallbackSlots(date);
            return fallbackData.data;
        }
    }

    private async checkConnectivity(): Promise<void> {
        try {
            // Hacer una petición ligera para verificar conectividad
            await axiosInstance.get('/health', { 
                timeout: 3000,
                validateStatus: (status) => status === 200 
            });
            this.isOnline = true;
        } catch (error) {
            this.isOnline = false;
        }
    }

    async getReservedSlots(date: string): Promise<string[]> {
        try {
            if (!this.isOnline) {
                return [];
            }

            const response = await axiosInstance.get(`/appointments/reserved/${date}`);
            return response.data.data || [];
        } catch (error) {
            console.error('Error al obtener citas reservadas:', error);
            return [];
        }
    }

    async createAppointment(appointmentData: any): Promise<any> {
        try {
            console.log('=== CREANDO CITA ===');
            console.log('Datos de la cita:', appointmentData);
            
            const response = await axiosInstance.post('/appointments', appointmentData);
            console.log('Respuesta del backend:', response.data);
            
            return { data: response.data };
        } catch (error: any) {
            console.error('Error al crear la cita:', error);
            
            if (error.response) {
                console.error('Error response:', error.response.data);
                return { 
                    error: true, 
                    message: error.response.data.message || 'Error al crear la cita' 
                };
            }
            
            return { 
                error: true, 
                message: 'Error de conexión al crear la cita' 
            };
        }
    }
}

export default AppointmentService.getInstance();
