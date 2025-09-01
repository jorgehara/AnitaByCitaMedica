# Pruebas para ANITA Bot

## Configuración completada

### ✅ Flujos implementados:
1. **Flujo de bienvenida** - Muestra opciones disponibles
2. **Flujo de horarios disponibles** - Lista slots libres para citas
3. **Flujo de reserva de citas** - Agenda citas médicas normales
4. **Flujo de sobreturnos** - Solicita sobreturnos
5. **Flujo de despedida** - Finaliza conversación

### ✅ Integración con Backend:
- ✅ Conecta con API del backend en `http://localhost:3001/api`
- ✅ Usa endpoint `/appointments/available/{date}` para horarios
- ✅ Usa endpoint `/appointments/reserved/{date}` para citas reservadas
- ✅ Usa endpoint `/appointments` para crear citas normales y sobreturnos
- ✅ Manejo de errores y sistema de respaldo

### ✅ Características principales:
- ✅ Configuración centralizada en `src/config/app.ts`
- ✅ Servicio de citas con cache y fallback
- ✅ Validación de horarios laborales
- ✅ Soporte para obras sociales
- ✅ Formateo de fechas en español
- ✅ Logs detallados para debugging

### 📋 Estructura de datos enviada al backend:

#### Para citas normales:
```json
{
  "clientName": "Juan Pérez",
  "socialWork": "INSSSEP",
  "phone": "5491168690066",
  "date": "2025-09-01",
  "time": "10:00",
  "email": "5491168690066@phone.com",
  "isSobreturno": false
}
```

#### Para sobreturnos:
```json
{
  "clientName": "Juan Pérez",
  "socialWork": "INSSSEP", 
  "phone": "5491168690066",
  "date": "2025-09-01",
  "time": "10:00",
  "email": "5491168690066@phone.com",
  "isSobreturno": true
}
```

### 🔧 Palabras clave para activar flujos:
- **Horarios**: "1", "horarios", "disponibles", "turnos", "horario"
- **Citas**: "2", "cita", "agendar", "turno", "reservar"
- **Sobreturnos**: "sobreturno", "sobre turno", "sobreturnos"
- **Bienvenida**: "hola", "hi", "hello", "buenas", "buenos días", etc.
- **Despedida**: "bye", "adiós", "chao", "chau"

### 🚀 Cómo ejecutar:
```bash
cd AnitaByCitaMedica
npm install
npm run dev
```

### 📝 Variables de entorno necesarias (.env):
```
API_URL=http://localhost:3001/api
PORT=3008
MONGO_DB_URI=mongodb://Jorge:JaraJorge*2025*!@localhost:27017/consultorio?authSource=admin
MONGO_DB_NAME=consultorio
ADMIN_NUMBER=5491168690066
TZ=America/Argentina/Buenos_Aires
```

### 🔍 Testing:
1. Verificar que el backend esté corriendo en puerto 3001
2. Verificar conexión a MongoDB
3. Escanear código QR de WhatsApp
4. Probar flujos con palabras clave
5. Verificar que las citas se crean en la base de datos

El bot ahora está completamente integrado con el backend y puede crear tanto citas normales como sobreturnos utilizando los endpoints correctos del sistema CitaMedicaBeta.
