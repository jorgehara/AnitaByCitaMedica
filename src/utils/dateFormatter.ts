import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatearFechaEspanol(fecha: string | Date): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}
