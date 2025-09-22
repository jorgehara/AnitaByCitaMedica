import { axiosInstance } from '../config/axios';
import { format } from 'date-fns';

async function testSobreturnos() {
    try {
        // 1. Obtener la fecha actual formateada
        const today = format(new Date(), 'yyyy-MM-dd');
        console.log('=== Test de Sobreturnos ===');
        console.log('Fecha de prueba:', today);

        // 2. Verificar sobreturnos disponibles inicialmente
        console.log('\n1. Consultando sobreturnos disponibles...');
        const initialAvailable = await axiosInstance.get(`/sobreturnos/available/${today}`);
        console.log('Sobreturnos disponibles inicialmente:', initialAvailable.data);

        if (!initialAvailable.data || initialAvailable.data.length === 0) {
            console.log('No hay sobreturnos disponibles para probar');
            return;
        }

        // 3. Intentar crear un sobreturno
        const sobreturnoNumber = initialAvailable.data[0].numero;
        console.log('\n2. Intentando crear sobreturno...');
        const sobreturnoData = {
            clientName: 'Test User',
            socialWork: 'INSSSEP',
            phone: '1234567890',
            date: today,
            sobreturnoNumber,
            time: initialAvailable.data[0].horario,
            email: 'test@test.com',
            isSobreturno: true
        };

        const createResponse = await axiosInstance.post('/sobreturnos', sobreturnoData);
        console.log('Respuesta de creación:', createResponse.data);

        // 4. Verificar sobreturnos disponibles después de la creación
        console.log('\n3. Verificando sobreturnos disponibles después de la creación...');
        const afterCreateAvailable = await axiosInstance.get(`/sobreturnos/available/${today}`);
        console.log('Sobreturnos disponibles después de crear:', afterCreateAvailable.data);

        // 5. Verificar que el sobreturno creado ya no aparece como disponible
        const sobreturnoSigueDisponible = afterCreateAvailable.data.some(
            (s: any) => s.numero === sobreturnoNumber
        );
        
        console.log('\n=== Resultados ===');
        console.log('Sobreturno creado con número:', sobreturnoNumber);
        console.log('¿El sobreturno sigue apareciendo como disponible?:', sobreturnoSigueDisponible);
        console.log('Cantidad de sobreturnos antes:', initialAvailable.data.length);
        console.log('Cantidad de sobreturnos después:', afterCreateAvailable.data.length);

        if (!sobreturnoSigueDisponible && afterCreateAvailable.data.length < initialAvailable.data.length) {
            console.log('\n✅ TEST EXITOSO: El sistema está manejando correctamente la disponibilidad');
        } else {
            console.log('\n❌ TEST FALLIDO: El sistema no está actualizando correctamente la disponibilidad');
        }

    } catch (error: any) {
        console.error('Error durante la prueba:', error.response?.data || error.message);
    }
}

// Ejecutar el test
testSobreturnos();