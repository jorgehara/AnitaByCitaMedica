// import { google } from 'googleapis';

// // Inicializa la librería cliente de Google y configura la autenticación con credenciales de la cuenta de servicio.
// const auth = new google.auth.GoogleAuth({
//     keyFile: './google.json',  // Ruta al archivo de clave de tu cuenta de servicio.
//     scopes: ['https://www.googleapis.com/auth/spreadsheets']  // Alcance para la API de Google Sheets.
// });

// const spreadsheetId = '1FSKCciEuaSQVBYSRI6HYxVJ-s8TXDfAoMivky78YTzU'; // ID de tu hoja de cálculo.

// // Función asíncrona para escribir datos en una hoja de cálculo de Google.
// async function writeToSheet(values, range) {
//     const sheets = google.sheets({ version: 'v4', auth }); // Crea una instancia cliente de la API de Sheets.
//     const valueInputOption = 'USER_ENTERED'; // Cómo se deben interpretar los datos de entrada.

//     const resource = {
//         values
//     }; // Los datos que se escribirán.

//     try {
//         const res = await sheets.spreadsheets.values.update({
//             spreadsheetId, range, valueInputOption, resource
//         });
//         return res; // Devuelve la respuesta de la API de Sheets.
//     } catch (error) {
//         console.error('error', error); // Registra errores.
//     }
// }

// // Función asíncrona para leer datos de una hoja de cálculo de Google.
// async function readSheet(range) {
//     const sheets = google.sheets({ version: 'v4', auth });

//     try {
//         const response = await sheets.spreadsheets.values.get({
//             spreadsheetId, range
//         });
//         const rows = response.data.values; // Extrae las filas de la respuesta.
//         return rows; // Devuelve las filas.
//     } catch (error) {
//         console.error('error', error); // Registra errores.
//     }
// }

// // Función asíncrona para agregar datos a una hoja de cálculo de Google.
// async function appendToSheet(values) {
//     const sheets = google.sheets({ version: 'v4', auth }); // Crea una instancia cliente de la API de Sheets.
//     const range = 'Sheet1!A1'; // El rango en la hoja para empezar a agregar datos.
//     const valueInputOption = 'USER_ENTERED'; // Cómo se deben interpretar los datos de entrada.

//     const resource = { values };

//     try {
//         const res = await sheets.spreadsheets.values.append({
//             spreadsheetId,
//             range,
//             valueInputOption,
//             resource,
//         });
//         return res; // Devuelve la respuesta de la API de Sheets.
//     } catch (error) {
//         console.error('error', error); // Registra errores.
//     }
// }

// async function getFilteredData(columnName, valueToSearch) {
//     const sheets = google.sheets({ version: 'v4', auth });

//     // Convertir el nombre de la columna a índice
//     const columnIndex = columnName.toUpperCase().charCodeAt(0) - 65;

//     const request = {
//         spreadsheetId,
//         resource: {
//             dataFilters: [
//                 {
//                     gridRange: {
//                         sheetId: 0, // Ajusta según el ID de la hoja si tienes múltiples hojas
//                         startRowIndex: 1, // Para omitir los encabezados
//                         startColumnIndex: 0,
//                         endColumnIndex: 4 // Columnas A a D
//                     }
//                 }
//             ]
//         }
//     };

//     try {
//         const response = await sheets.spreadsheets.values.batchGetByDataFilter(request);
//         const matchedRanges = response.data.valueRanges;

//         if (matchedRanges && matchedRanges.length > 0) {
//             // Obtener todas las filas que coinciden con el filtro
//             const allRows = matchedRanges[0].valueRange.values || [];

//             // Filtrar las filas según el valor específico
//             const filteredData = allRows.filter(row => row[columnIndex] === valueToSearch);

//             return filteredData;
//         } else {
//             console.log('No data found.');
//             return [];
//         }
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         return [];
//     }
// }

// export { writeToSheet, readSheet, appendToSheet, getFilteredData };