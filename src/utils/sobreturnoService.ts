import { axiosInstance } from '../config/axios';
import cache from './cache';

export interface SobreturnoResponse {
    sobreturnoNumber: number;
    time: string;
    status?: 'confirmed' | 'pending' | 'cancelled';
    isSobreturno?: boolean;
}

export interface SobreturnoData {
    clientName: string;
    socialWork: string;
    phone: string;
    date: string;
    time: string;
    sobreturnoNumber: number;
    email?: string;
    isSobreturno?: boolean;
    status?: 'confirmed' | 'pending' | 'cancelled';
    observations?: string;
}


export interface APIResponse {
    success: boolean;
    data: any;
    message?: string;
}

export interface APIResponseWrapper {
    data?: APIResponse;
    error?: boolean;
    message?: string;
}

export class SobreturnoService {
    private static instance: SobreturnoService;
    private isOnline: boolean = true;

    private constructor() {
        // Constructor privado para Singleton
        this.checkConnectivity(); // Verificar conectividad inicial
    }

    public static getInstance(): SobreturnoService {
        if (!SobreturnoService.instance) {
            SobreturnoService.instance = new SobreturnoService();
        }
        return SobreturnoService.instance;
    }

    private getCacheKey(date: string, type: string = 'reserved'): string {
        return `sobreturnos_${type}_${date}`;
    }

    private async checkConnectivity(): Promise<void> {
        try {
            await axiosInstance.get('/sobreturnos/health', { 
                timeout: 3000,
                validateStatus: (status) => status === 200 
            });
            this.isOnline = true;
            console.log('[SOBRETURNO SERVICE] Conectividad verificada');
        } catch (error) {
            this.isOnline = false;
            console.warn('[SOBRETURNO SERVICE] Sistema en modo offline:', error.message);
        }
    }

    private readonly timeMap = {
        '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
        '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
    };

    private getSobreturnoNumber(time: string): number {
        const number = this.timeMap[time];
        if (!number) {
            const hour = parseInt(time.split(':')[0], 10);
            return hour < 15 ? 1 : 6; // Default a 1 para mañana, 6 para tarde
        }
        return number;
    }

    private formatSobreturnoResponse(data: any): SobreturnoResponse {
        const time = data.time;
        const sobreturnoNumber = data.sobreturnoNumber || this.getSobreturnoNumber(time);

        return {
            sobreturnoNumber,
            time,
            status: data.status || 'confirmed',
            isSobreturno: true
        };
    }

    async getReservedSobreturnos(date: string): Promise<SobreturnoResponse[]> {
        await this.checkConnectivity();
        const cacheKey = this.getCacheKey(date);
        
        console.log('[SOBRETURNO SERVICE] Obteniendo sobreturnos:', { date, isOnline: this.isOnline });
        
        if (!this.isOnline) {
            const cachedData = cache.get<SobreturnoResponse[]>(cacheKey) || [];
            console.log('[SOBRETURNO SERVICE] Usando caché:', { 
                count: cachedData.length,
                números: cachedData.map(s => s.sobreturnoNumber)
            });
            return cachedData;
        }

        try {
            // Consultar sobreturnos para la fecha
            console.log('[SOBRETURNO SERVICE] Consultando API para fecha:', date);
            const response = await axiosInstance.get(`/sobreturnos/date/${date}`);

            if (!response.data || !Array.isArray(response.data)) {
                console.log('[SOBRETURNO SERVICE] No hay datos válidos en la respuesta');
                return [];
            }

            console.log('[SOBRETURNO SERVICE] Datos recibidos:', response.data);

            // Filtrar y formatear los sobreturnos
            const sobreturnos = response.data.map(s => ({
                sobreturnoNumber: s.sobreturnoNumber,
                time: s.time,
                status: s.status || 'confirmed',
                isSobreturno: true
            }));

            console.log('[SOBRETURNO SERVICE] Sobreturnos procesados:', {
                total: sobreturnos.length,
                números: sobreturnos.map(s => s.sobreturnoNumber)
            });

            cache.set(cacheKey, sobreturnos);
            return sobreturnos;
        } catch (error) {
            console.error('Error al obtener sobreturnos reservados:', error);
            return cache.get<SobreturnoResponse[]>(cacheKey) || [];
        }
    }

    async createSobreturno(data: SobreturnoData): Promise<APIResponseWrapper> {
        await this.checkConnectivity();
        console.log('[SOBRETURNO SERVICE] Iniciando creación de sobreturno:', { 
            date: data.date, 
            número: data.sobreturnoNumber 
        });
        
        if (!this.isOnline) {
            return {
                error: true,
                message: 'No hay conexión con el servidor. Por favor, intente más tarde.'
            };
        }

        try {
            // Verificar disponibilidad antes de crear
            const isAvailable = await this.isSobreturnoAvailable(data.date, data.sobreturnoNumber);
            if (!isAvailable) {
                console.log('[SOBRETURNO SERVICE] El sobreturno ya no está disponible:', {
                    date: data.date,
                    número: data.sobreturnoNumber
                });
                return {
                    error: true,
                    message: 'El sobreturno ya no está disponible'
                };
            }

            const finalData: SobreturnoData = {
                ...data,
                isSobreturno: true,
                status: 'confirmed',
                email: data.email || `${data.phone}@sobreturno.temp`
            };

            console.log('[SOBRETURNO SERVICE] Enviando datos al servidor:', finalData);
            const response = await axiosInstance.post('/sobreturnos', finalData);
            
            // Forzar actualización inmediata de las cachés
            console.log('[SOBRETURNO SERVICE] Invalidando y actualizando cachés');
            
            // 1. Borrar todas las cachés relacionadas
            const cacheKeys = [
                this.getCacheKey(data.date),
                this.getCacheKey(data.date, 'available'),
                this.getCacheKey(data.date, 'validate')
            ];
            cacheKeys.forEach(key => cache.delete(key));
            
            // 2. Forzar actualización de la lista de reservados
            await this.getReservedSobreturnos(data.date);

            console.log('[SOBRETURNO SERVICE] Sobreturno creado exitosamente');
            return {
                data: {
                    success: true,
                    data: response.data
                }
            };
        } catch (error: any) {
            console.error('Error al crear sobreturno:', error);
            return {
                error: true,
                message: error.response?.data?.message || 'Error al crear el sobreturno'
            };
        }
    }

    async getAvailableSobreturnos(date: string): Promise<APIResponseWrapper> {
        await this.checkConnectivity();
        console.log('[SOBRETURNO SERVICE] Obteniendo sobreturnos disponibles para:', date);
        const cacheKey = this.getCacheKey(date, 'available');
        
        if (!this.isOnline) {
            console.log('[SOBRETURNO SERVICE] Modo offline - usando caché');
            const cachedData = cache.get(cacheKey);
            return cachedData || {
                error: true,
                message: 'No hay conexión con el servidor'
            };
        }

        try {
            // Obtener los sobreturnos ya reservados
            const reservados = await this.getReservedSobreturnos(date);
            const reservedSet = new Set(reservados.map(r => r.sobreturnoNumber));
            
            // Definir horarios y números de sobreturno
            const slots = [
                { time: '11:00', number: 1 }, { time: '11:15', number: 2 },
                { time: '11:30', number: 3 }, { time: '11:45', number: 4 },
                { time: '12:00', number: 5 }, { time: '19:00', number: 6 },
                { time: '19:15', number: 7 }, { time: '19:30', number: 8 },
                { time: '19:45', number: 9 }, { time: '20:00', number: 10 }
            ];

            const now = new Date();
            const appointmentDate = new Date(date);
            const isSameDay = now.toDateString() === appointmentDate.toDateString();

            // Crear lista de sobreturnos con su disponibilidad
            const disponibles = slots.map(slot => {
                const [hours, minutes] = slot.time.split(':').map(Number);
                const slotTime = new Date(appointmentDate);
                slotTime.setHours(hours, minutes, 0, 0);

                // Un sobreturno está disponible si:
                // 1. No está reservado
                // 2. Si es hoy, el horario no ha pasado
                const isTimeValid = !isSameDay || slotTime > now;
                const isAvailable = !reservedSet.has(slot.number) && isTimeValid;

                return {
                    sobreturnoNumber: slot.number,
                    time: slot.time,
                    isSobreturno: true,
                    isAvailable
                };
            });

            console.log('[SOBRETURNO SERVICE] Sobreturnos disponibles después de filtrar:', 
                disponibles.map(s => s.sobreturnoNumber)
            );

            const result: APIResponseWrapper = {
                data: {
                    success: true,
                    data: disponibles
                }
            };
            
            cache.set(cacheKey, result);
            return result;
        } catch (error: any) {
            console.error('Error al obtener sobreturnos disponibles:', error);
            const cachedData = cache.get(cacheKey);
            return cachedData || {
                error: true,
                message: 'Error al obtener sobreturnos disponibles'
            };
        }
    }

    public async isSobreturnoAvailable(date: string, sobreturnoNumber: number): Promise<boolean> {
        await this.checkConnectivity();
        console.log('[SOBRETURNO SERVICE] Verificando disponibilidad:', { date, sobreturnoNumber, isOnline: this.isOnline });

        try {
            const response = await this.getAvailableSobreturnos(date);
            if (response.error || !response.data?.data) {
                return false;
            }

            const slot = response.data.data.find(s => s.sobreturnoNumber === sobreturnoNumber);
            return slot?.isAvailable || false;
            
            if (!this.isOnline) {
                console.log('[SOBRETURNO SERVICE] Modo offline - usando caché');
                reservados = cache.get<SobreturnoResponse[]>(this.getCacheKey(date)) || [];
                console.log('[SOBRETURNO SERVICE] Datos caché:', { reservadosCount: reservados.length });
            } else {
                // Obtener la lista de sobreturnos reservados
                reservados = await this.getReservedSobreturnos(date);
                console.log('[SOBRETURNO SERVICE] Sobreturnos reservados:', reservados.map(r => r.sobreturnoNumber));
            }
            
            // Verificar si está reservado
            const isAvailable = !reservados.some(s => s.sobreturnoNumber === sobreturnoNumber);
            console.log('[SOBRETURNO SERVICE] Resultado disponibilidad:', { 
                sobreturnoNumber, 
                isAvailable,
                reservados: reservados.map(r => r.sobreturnoNumber)
            });
            
            return isAvailable;
        } catch (error) {
            console.error('[SOBRETURNO SERVICE] Error al verificar disponibilidad:', error);
            
            // Último recurso: verificar con caché
            const reservados = cache.get<SobreturnoResponse[]>(this.getCacheKey(date)) || [];
            const isAvailable = !reservados.some(s => s.sobreturnoNumber === sobreturnoNumber);
            console.log('[SOBRETURNO SERVICE] Resultado fallback caché:', { isAvailable, reservadosCount: reservados.length });
            return isAvailable;
        }
    }

    clearCache(): void {
        cache.clear();
        console.log('[SOBRETURNO SERVICE] Cache de sobreturnos limpiado completamente');
    }

    clearDateCache(date: string): void {
        const cacheKeys = [
            this.getCacheKey(date),
            this.getCacheKey(date, 'available'),
            this.getCacheKey(date, 'validate')
        ];
        
        console.log('[SOBRETURNO SERVICE] Limpiando cachés para fecha:', date);
        cacheKeys.forEach(key => {
            cache.delete(key);
            console.log('[SOBRETURNO SERVICE] Cache eliminado:', key);
        });
    }

    async refreshAvailableSobreturnos(date: string): Promise<APIResponseWrapper> {
        console.log('[SOBRETURNO SERVICE] Forzando actualización de sobreturnos disponibles');
        this.clearDateCache(date);
        return this.getAvailableSobreturnos(date);
    }

    async getSobreturnosStatus(date: string): Promise<any> {
        try {
            const response = await axiosInstance.get(`/sobreturnos/status/${date}`);
            return response.data;
        } catch (error) {
            console.error('Error getting sobreturnos status:', error);
            return { data: { reservados: [] } };
        }
    }
}

// Exportar la instancia única
export default SobreturnoService.getInstance();