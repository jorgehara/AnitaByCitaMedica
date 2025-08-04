// import { addKeyword, EVENTS } from "@builderbot/bot";
// import chat from "../scripts/chatgpt";
// import { join } from "path";
// import { readFileSync } from "fs";

// const promptConsultasPath = join(
//     "mensajes",
//     "promptConsultas.txt"
// );
// const promptConsultas = readFileSync(promptConsultasPath, "utf8");

// const gptFlow = addKeyword(EVENTS.ACTION)
//     .addAction(async (ctx, ctxFn) => {
//         const prompt = promptConsultas;
//         const text = ctx.body;

//         // Recuperar el estado actual
//         const userState = await ctxFn.state.getMyState() || {};
//         userState.conversations = userState.conversations ?? [];
//         const conversations = userState.conversations;

//         // Crear el contexto con las últimas dos conversaciones
//         const contextMessages = conversations.flatMap(conv => [
//             { role: "user", content: conv.question },
//             { role: "assistant", content: conv.answer }
//         ]);

//         // Añadir la pregunta actual al contexto
//         contextMessages.push({ role: "user", content: text });

//         // Obtener la respuesta de ChatGPT
//         const response = await chat(prompt, contextMessages);

//         // Actualizar el estado con la nueva conversación
//         const newConversations = [...conversations, { question: text, answer: response }];
//         if (newConversations.length > 1) {
//             newConversations.shift(); // Mantener solo las últimas dos entradas
//         }

//         await ctxFn.state.update({ conversations: newConversations });

//         // Enviar la respuesta al usuario
//         if (response !== null) {
//             await ctxFn.flowDynamic(response);
//         } else {
//             // Handle the case where response is null
//             // For example, you can provide a default response or log an error
//         }
//     });

// export  { gptFlow };