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
        let sobreturnoNumber = parseInt(data.sobreturnoNumber, 10);

        // Validar que el sobreturnoNumber esté dentro del rango permitido (1-10)
        if (!sobreturnoNumber || sobreturnoNumber < 1 || sobreturnoNumber > 10) {
            // Determinar el número de sobreturno basado en el horario exacto
            const timeMap = {
                '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
                '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
            };
            sobreturnoNumber = timeMap[time] || 0;

            if (sobreturnoNumber === 0) {
                throw new Error('Horario de sobreturno inválido');
            }
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

            if (!response.data) {
                console.log('[SOBRETURNO SERVICE] No hay datos en la respuesta');
                return [];
            }

            if (!Array.isArray(response.data)) {
                console.error('[SOBRETURNO SERVICE] Respuesta inválida:', response.data);
                return [];
            }

            console.log('[SOBRETURNO SERVICE] Datos recibidos:', response.data);

            // Primero, validar y formatear los sobreturnos
            const sobreturnos = response.data
                .filter(s => {
                    // Validar que sea un sobreturno confirmado
                    const isValid = s.isSobreturno === true && s.status === 'confirmed';
                    if (!isValid) {
                        console.log('[SOBRETURNO SERVICE] Descartando registro no confirmado:', s);
                        return false;
                    }
                    
                    // Validar el número y horario
                    const timeMap = {
                        '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
                        '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
                    };
                    
                    const expectedNumber = timeMap[s.time];
                    if (!expectedNumber) {
                        console.log('[SOBRETURNO SERVICE] Horario inválido:', s.time);
                        return false;
                    }
                    
                    // Si tiene número, verificar que coincida con el horario
                    if (s.sobreturnoNumber && s.sobreturnoNumber !== expectedNumber) {
                        console.log('[SOBRETURNO SERVICE] Número no coincide con horario:', {
                            esperado: expectedNumber,
                            actual: s.sobreturnoNumber,
                            horario: s.time
                        });
                        return false;
                    }
                    
                    return true;
                })
                .map(s => this.formatSobreturnoResponse(s));

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
        console.log('[SOBRETURNO SERVICE] Iniciando creación de sobreturno:', {
            date: data.date,
            número: data.sobreturnoNumber
        });

        try {
            // Verificar disponibilidad directamente con el servidor
            const validationResponse = await axiosInstance.get(`/sobreturnos/validate`, {
                params: {
                    date: data.date,
                    sobreturnoNumber: data.sobreturnoNumber
                },
                timeout: 3000
            });

            if (!validationResponse.data?.available) {
                return {
                    error: true,
                    message: 'El sobreturno ya no está disponible'
                };
            }

            // Preparar datos
            const finalData: SobreturnoData = {
                ...data,
                isSobreturno: true,
                status: 'confirmed',
                email: data.email || `${data.phone}@sobreturno.temp`
            };

            // Intentar crear el sobreturno
            const response = await axiosInstance.post('/sobreturnos', finalData);

            // Limpiar caché solo después de una creación exitosa
            this.clearDateCache(data.date);

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
        console.log('[SOBRETURNO SERVICE] Obteniendo sobreturnos disponibles para:', date);
        const cacheKey = this.getCacheKey(date, 'available');
        
        // Primero intentar usar caché
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[SOBRETURNO SERVICE] Usando datos en caché');
            return cachedData;
        }

        try {
            // Intentar obtener datos del servidor
            const response = await axiosInstance.get(`/sobreturnos/available/${date}`, {
                timeout: 5000
            });

            if (response.data?.data) {
                const result: APIResponseWrapper = {
                    data: {
                        success: true,
                        data: response.data.data
                    }
                };
                cache.set(cacheKey, result);
                return result;
            }

            // Si no hay datos del servidor, generar lista local
            const timeMap = {
                '11:00': 1, '11:15': 2, '11:30': 3, '11:45': 4, '12:00': 5,
                '19:00': 6, '19:15': 7, '19:30': 8, '19:45': 9, '20:00': 10
            };

            // Obtener reservados de forma directa sin validaciones adicionales
            const reservados = await axiosInstance.get(`/sobreturnos`, {
                params: { date, status: 'confirmed' }
            });

            const reservedNumbers = reservados.data?.map(r => r.sobreturnoNumber) || [];
            
            const disponibles = Object.entries(timeMap)
                .filter(([_, num]) => !reservedNumbers.includes(num))
                .map(([time, sobreturnoNumber]) => ({
                    sobreturnoNumber,
                    time,
                    isSobreturno: true,
                    isAvailable: true
                }));

            const result: APIResponseWrapper = {
                data: {
                    success: true,
                    data: disponibles
                }
            };
            
            cache.set(cacheKey, result);
            return result;

        } catch (error: any) {
            console.error('Error al obtener sobreturnos disponibless:', error);
            // Intentar usar caché como último recurso
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
                return !reservados.some(s => s.sobreturnoNumber === sobreturnoNumber);
            }

            // Usar un solo endpoint principal para validación
            const response = await axiosInstance.get('/sobreturnos/validate', {
                params: { date, sobreturnoNumber },
                timeout: 3000
            });

            if (response.data?.available !== undefined) {
                return response.data.available;
            }

            // Si no hay respuesta clara, verificar con la lista de reservados
            const reservados = await this.getReservedSobreturnos(date);
            return !reservados.some(s => s.sobreturnoNumber === sobreturnoNumber);

        } catch (error) {
            console.error('[SOBRETURNO SERVICE] Error al validar disponibilidad:', error);
            // En caso de error, usar caché
            const reservados = cache.get<SobreturnoResponse[]>(this.getCacheKey(date)) || [];
            return !reservados.some(s => s.sobreturnoNumber === sobreturnoNumber);
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