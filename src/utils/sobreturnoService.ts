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
                    // Validar que sea un sobreturno
                    if (!s.isSobreturno) {
                        console.log('[SOBRETURNO SERVICE] Descartando registro que no es sobreturno:', s);
                        return false;
                    }
                    
                    // Los sobreturnos confirmados no están disponibles
                    if (s.status === 'confirmed') {
                        console.log('[SOBRETURNO SERVICE] Sobreturno confirmado, no disponible:', s.sobreturnoNumber);
                        return true;  // Lo incluimos para marcar el número como ocupado
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
            
            // Filtrar horarios válidos y crear lista de disponibles
            const disponibles = Object.entries(timeMap)
                .filter(([time, num]) => {
                    // Verificar si el horario es válido para la fecha actual
                    const now = new Date();
                    const [hours, minutes] = time.split(':').map(Number);
                    const appointmentTime = new Date(date);
                    appointmentTime.setHours(hours, minutes, 0, 0);
                    
                    // Solo incluir horarios futuros y que no estén reservados
                    return appointmentTime > now && !reservedNumbersSet.has(num);
                })
                .map(([time, sobreturnoNumber]) => ({
                    sobreturnoNumber,
                    time,
                    isSobreturno: true,
                    isAvailable: true
                }));

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

            // Intentar con el endpoint de validación
            console.log('[SOBRETURNO SERVICE] Consultando endpoint de validación');
            try {
                // Primero intentamos con el nuevo endpoint específico para el número
                const response = await axiosInstance.get(`/sobreturnos/validate/${sobreturnoNumber}`, {
                    timeout: 3000
                });
                console.log('[SOBRETURNO SERVICE] Respuesta validación:', response.data);
                
                if (response.data?.available !== undefined) {
                    return response.data.available;
                }
            } catch (validationError) {
                console.log('[SOBRETURNO SERVICE] Error en validación del nuevo endpoint:', validationError.message);
                
                // Si falla, intentamos con el endpoint antiguo
                try {
                    const response = await axiosInstance.get('/sobreturnos/validate', {
                        params: { date, sobreturnoNumber },
                        timeout: 3000
                    });
                    console.log('[SOBRETURNO SERVICE] Respuesta validación antiguo endpoint:', response.data);
                    
                    if (response.data?.available !== undefined) {
                        return response.data.available;
                    }
                } catch (oldValidationError) {
                    console.log('[SOBRETURNO SERVICE] Error en validación del endpoint antiguo:', oldValidationError.message);
                }
            }

            // Si el endpoint de validación falla, consultar endpoint de disponibilidad
            console.log('[SOBRETURNO SERVICE] Consultando endpoint de disponibilidad');
            const availableResponse = await axiosInstance.get(`/sobreturnos/available/${date}`);
            if (Array.isArray(availableResponse.data)) {
                const disponible = availableResponse.data.some(
                    s => s.sobreturnoNumber === sobreturnoNumber
                );
                console.log('[SOBRETURNO SERVICE] Resultado disponibilidad:', {
                    sobreturnoNumber,
                    disponible,
                    disponibles: availableResponse.data.map(s => s.sobreturnoNumber)
                });
                return disponible;
            }

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