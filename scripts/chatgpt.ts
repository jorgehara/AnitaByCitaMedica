// import dotenv from 'dotenv';
// dotenv.config();
// import OpenAI from "openai";

// const openaiApiKey = process.env.OPENAI_API_KEY;

// const chat = async (prompt, messages) => {
//     try {
//         const openai = new OpenAI({
//             apiKey: openaiApiKey,
//         });
//         const completion = await openai.chat.completions.create({
//             model: "gpt-3.5-turbo",
//             messages: [
//                 { role: "system", content: prompt },
//                 ...messages
//             ],
//         });
//         const answ = completion.choices[0].message.content;
//         return answ;
//     } catch (err) {
//         console.error("Error al conectar con OpenAI:", err);
//         return "ERROR";
//     }
// };

// export default  chat ;