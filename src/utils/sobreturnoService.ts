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

    private formatSobreturnoResponse(data: any): SobreturnoResponse {
        const time = data.time;
        let sobreturnoNumber = data.sobreturnoNumber;

        // Si ya tiene un número de sobreturno, usarlo directamente
        if (sobreturnoNumber && sobreturnoNumber >= 1 && sobreturnoNumber <= 10) {
            return {
                sobreturnoNumber,
                time,
                status: data.status || 'confirmed',
                isSobreturno: true
            };
        }

        // Si no tiene número, intentar asignarlo basado en el horario
        const timeMap = {
            '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
            '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
        };

        sobreturnoNumber = timeMap[time];

        // Si no podemos determinar el número, asignar uno basado en el turno (mañana/tarde)
        if (!sobreturnoNumber) {
            const hour = parseInt(time.split(':')[0], 10);
            sobreturnoNumber = hour < 15 ? 1 : 6; // Default a 1 para mañana, 6 para tarde
        }

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
        
        const timeMap = {
            '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
            '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
        };
        
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
            // Intentar obtener la lista de sobreturnos ocupados
            console.log('[SOBRETURNO SERVICE] Consultando API para fecha:', date);
            const response = await axiosInstance.get(`/sobreturnos`, {
                params: {
                    date,
                    status: 'confirmed',
                    isSobreturno: true
                },
                timeout: 5000
            });

            if (!response.data || !Array.isArray(response.data)) {
                console.log('[SOBRETURNO SERVICE] No hay datos válidos en la respuesta');
                return [];
            }

            console.log('[SOBRETURNO SERVICE] Datos recibidos:', response.data);

            // Validar y formatear los sobreturnos
            const sobreturnos = response.data
                .filter(s => {
                    // Validar que sea un sobreturno para la fecha correcta
                    if (!s.isSobreturno || s.date !== date) {
                        return false;
                    }

                    // Validar el número y horario
                    const timeMap = {
                        '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
                        '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
                    };

                    const expectedNumber = timeMap[s.time];
                    if (!expectedNumber) {
                        console.log('[SOBRETURNO SERVICE] Horario no válido:', s.time);
                        return false;
                    }

                    // Asignar número si no tiene uno
                    if (!s.sobreturnoNumber) {
                        s.sobreturnoNumber = expectedNumber;
                    }

                    return true;
                })
                .map(s => ({
                    sobreturnoNumber: s.sobreturnoNumber,
                    time: s.time,
                    status: s.status || 'confirmed',
                    isSobreturno: true
                }));

            console.log('[SOBRETURNO SERVICE] Sobreturnos procesados:', {
                total: response.data.length,
                válidos: sobreturnos.length,
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
            // Primero obtener los sobreturnos reservados
            const reservados = await this.getReservedSobreturnos(date);
            console.log('[SOBRETURNO SERVICE] Sobreturnos reservados:', reservados.map(r => r.sobreturnoNumber));

            // Generar lista completa de sobreturnos
            const timeMap = {
                '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
                '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
            };
            
            // Filtrar y obtener números ya reservados válidos
            const reservedNumbers = reservados
                .filter(r => {
                    if (!r || !r.sobreturnoNumber) return false;
                    return r.sobreturnoNumber >= 1 && r.sobreturnoNumber <= 10;
                })
                .map(r => r.sobreturnoNumber);
            console.log('[SOBRETURNO SERVICE] Números reservados válidos:', reservedNumbers);
            
            // Convertir los números reservados a Set para búsqueda más eficiente
            const reservedNumbersSet = new Set(reservedNumbers);
            
            // Crear lista completa de horarios posibles
            const disponibles = Object.entries(timeMap)
                .map(([time, num]) => {
                    const [hours, minutes] = time.split(':').map(Number);
                    const appointmentTime = new Date(date);
                    appointmentTime.setHours(hours, minutes, 0, 0);
                    
                    const now = new Date();
                    const isTimeValid = appointmentTime > now;
                    const isReserved = reservedNumbersSet.has(num);
                    
                    return {
                        sobreturnoNumber: num,
                        time,
                        isSobreturno: true,
                        isAvailable: isTimeValid && !isReserved
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

    async isSobreturnoAvailable(date: string, sobreturnoNumber: number): Promise<boolean> {
        await this.checkConnectivity();
        console.log('[SOBRETURNO SERVICE] Verificando disponibilidad:', { date, sobreturnoNumber, isOnline: this.isOnline });
        
        try {
            if (!this.isOnline) {
                console.log('[SOBRETURNO SERVICE] Modo offline - usando caché');
                const reservados = cache.get<SobreturnoResponse[]>(this.getCacheKey(date)) || [];
                const isAvailable = !reservados.some(s => s.sobreturnoNumber === sobreturnoNumber);
                console.log('[SOBRETURNO SERVICE] Resultado caché:', { isAvailable, reservadosCount: reservados.length });
                return isAvailable;
            }

            // Primero verificar si el número es válido
            if (sobreturnoNumber < 1 || sobreturnoNumber > 10) {
                console.log('[SOBRETURNO SERVICE] Número de sobreturno inválido:', sobreturnoNumber);
                return false;
            }

            // Obtener reservados (ya sea de caché o del servidor)
            let reservedSlots: SobreturnoResponse[];
            
            if (!this.isOnline) {
                console.log('[SOBRETURNO SERVICE] Modo offline - usando caché');
                reservedSlots = cache.get<SobreturnoResponse[]>(this.getCacheKey(date)) || [];
            } else {
                reservedSlots = await this.getReservedSobreturnos(date);
            }

            // Filtrar por fecha actual y estado confirmado
            const currentReservations = reservedSlots.filter(slot => {
                return slot.sobreturnoNumber === sobreturnoNumber && 
                       slot.status === 'confirmed';
            });

            const isSlotAvailable = currentReservations.length === 0;

            console.log('[SOBRETURNO SERVICE] Resultado validación:', {
                date,
                sobreturnoNumber,
                reservedCount: reservedSlots.length,
                matchingReservations: currentReservations.length,
                isAvailable: isSlotAvailable
            });

            return isSlotAvailable;

            // Si ambos endpoints fallan, verificar con lista de reservados
            console.log('[SOBRETURNO SERVICE] Usando verificación por lista de reservados');
            const reservados = await this.getReservedSobreturnos(date);
            const isAvailable = !reservados.some(s => s.sobreturnoNumber === sobreturnoNumber);
            console.log('[SOBRETURNO SERVICE] Resultado final:', {
                isAvailable,
                sobreturnoNumber,
                reservadosCount: reservados.length,
                reservados: reservados.map(r => r.sobreturnoNumber)
            });
            return isAvailable;

        } catch (error) {
            console.error('[SOBRETURNO SERVICE] Error al validar disponibilidad:', error);
            
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