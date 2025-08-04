// import { addKeyword, EVENTS } from "@builderbot/bot";
// import { join, dirname } from "path";
// import { fileURLToPath } from "url";

// import { gptFlow }from "./gpt.flow";


// // Convierte la URL del archivo actual en una ruta de archivo
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// import { readFileSync } from "fs";

// import { appointmentFlow } from "./appointment.flow";

// const pathMenuDesarrolloSocial = join(
//   __dirname,
//   "../mensajes",
//   "menuDesarrolloSocial.txt"
// );

// const menuTextDesarrolloSoial= readFileSync(pathMenuDesarrolloSocial, "utf8");

// const pathMenu = join(__dirname, "../mensajes", "menu.txt");
// const menuText = readFileSync(pathMenu, "utf8");
// const srcPath = join(__dirname, "../src", "Horarios habituales.png");

// const flow4 = addKeyword("4")
//   .addAnswer("🗑️ *RECOLECCIÓN DE RESIDUOS* 🗑️\n\n🚛 *Horarios de Recolección:*\n\n- 🗓️ Lunes a Miércoles: 06:00 a 12:00\n- 🗓️ Jueves y Viernes: 13:00 a 18:00\n\n⚠️ *Los horarios y días de recolección pueden variar durante feriados o por cuestiones climáticas.*\n\n🌟 *¡Gracias por tu colaboración!*🌟")
//   .addAction(async (ctx, ctxFn) => {
//     const menuFlow = await import("./menu.flow.js").then((mod) => mod.menuFlow);
//     await ctxFn.gotoFlow(menuFlow);
//   })
//   .addAction(async (ctx, ctxFn) => {
//     const menuFlow = await import("./menu.flow.js").then((mod) => mod.menuFlow);
//     await ctxFn.gotoFlow(menuFlow);
//   });

// const flow10 = addKeyword(["10", "cita", "turno", "medico"])
//   .addAction(async (ctx, ctxFn) => {
//     await ctxFn.gotoFlow(appointmentFlow);
//   });



// const flow5 = addKeyword("5") 
//   .addAnswer(
//     "Recordá que si quieres conocer sobre la información que puedo brindarte puedes escribir *Menu* y te mostraré las opciones disponibles 😊...¿En qué te puedo ayudar?",
//     { capture: true },
//     async (ctx, ctxFn) => {
//       await ctxFn.gotoFlow(gptFlow);
//     }
//   );

// const flow5 = addKeyword("5") 
//   .addAnswer(
//     "💧 *REPARTO Y VENTA DE AGUA* 💧\n\n🕔 *Horarios de venta de Agua*\n\nLunes a Jueves desde las 7.00 a las 9.00hs.\nSolicita tu número de manera presencial. Se entregan 40 números diarios.\n\n💲 Precio: 1.000 litros de agua por $2.000.-"
//   )
//   .addAction(async (ctx, ctxFn) => {
//     const menuFlow = await import("./menu.flow.js").then((mod) => mod.menuFlow);
//     await ctxFn.gotoFlow(menuFlow);
//   })

  // const flow6 = addKeyword("6") 
  // .addAnswer(
  //   "🚌 *VIAJES A CENTROS DE SALUD*\n\n📋*Requisitos Obligatorios*\n- DNI vigente en mano.\n- Receta u orden médica para realizarse el estudio correspondiente.\n*- Asistir de manera presencial a la Oficina de Desarrollo Social.*\n\n📍 En Calle Sarmiento 625\n🗓️ Horarios: Lunes a Viernes, de 8:00 a 12:00 hs"
  // ).addAction(async (ctx, ctxFn) => {
  //   const menuFlow = await import("./menu.flow.js").then((mod) => mod.menuFlow);
  //   await ctxFn.gotoFlow(menuFlow);
  // })


// const flow7 = addKeyword("7") 
//   .addAnswer(
//     "📢 *Consultas, Sugerencias o Reclamos* 📢\n\n ✍¡Estamos aquí para ayudarte!\nDejaremos asentada su consulta, sugerencia o reclamo, luego de unas breves preguntas..."
//   )
//   .addAction(async (ctx, ctxFn) => {
//     await ctxFn.gotoFlow(formFlow);
//   });

//   const flow8 = addKeyword("8") 
//   .addAnswer(
// `🛒 𝗣𝗔𝗠𝗣𝗔 𝗗𝗘𝗟 𝗜𝗡𝗙𝗜𝗘𝗥𝗡𝗢 – 𝗣𝘂𝗻𝘁𝗼𝘀 𝗱𝗲 𝘃𝗲𝗻𝘁𝗮 𝗼𝗳𝗶𝗰𝗶𝗮𝗹𝗲𝘀:

// 📍 *Dirección de Cultura* Alte. Brown e/ H. Yrigoyen y Güemes (Ex Oficina de Catastro)
// 📞 Gladis García: 3644369747 
// 📞 Karla Barraza: 3644124768

// 📍 *Municipalidad de Pampa del Infierno*
// 📞 Magalí Sosa: 3644566730 
// 📞 Cinthia Espíndola: 3644628534
// 📞 Patricia Alomo: 3644377552 
// 📞 Ramiro Triantofilo: 3644617346
// 📞 Betiana Garofalo: 3644563708 
// 📞 Sandra Sosa: 3644362583
// 📞 Mónica Moyano: 3644673961 
// 📞 Nico Juárez: 3644822768
// 📞 Ricardo Caro: 3644633602 
// 📞 Silvia Trejo: 3644371845
// 📞 Ariana Cabeza: 3644112744

// 🎶 ¡Te esperamos para disfrutar del Festival Provincial del Chivo en Pampa del Infierno! 🐐`
//   ).addAction(async (ctx, ctxFn) => {
//     const menuFlow = await import("./menu.flow.js").then((mod) => mod.menuFlow);
//     await ctxFn.gotoFlow(menuFlow);
//   });

//   const flow9 = addKeyword("9") 
//   .addAnswer(
// `🔖 𝗣𝗨𝗡𝗧𝗢𝗦 𝗗𝗘 𝗩𝗘𝗡𝗧𝗔 𝗬 𝗖𝗢𝗡𝗧𝗔𝗖𝗧𝗢𝗦 𝗣𝗔𝗥𝗔 𝗘𝗡𝗧𝗥𝗔𝗗𝗔𝗦
// *SÁENZ PEÑA*
// 📞 Gabriela Pucheta: 3644445089

// *CHARATA*
// 📞 Juan Ignacio Escobedo: 3731527275

// *J. J. CASTELLI*
// 📞 Radio Fan / Radio Norte / El Pórtico

// *MONTE QUEMADO Y LOS FRENTONES*
// 📞 Gonzalo Triantofilo: 3644792182

// *MIRAFLORES*
// 📞 Dalma Albornoz: 3644357269

// *CAMPO LARGO*
// 📞 Paola Arguello: 3644575250

// *LAS BREÑAS*
// 📞 Pedro Aballay: 3731546521

// 🎶 ¡Te esperamos para disfrutar del Festival Provincial del Chivo en Pampa del Infierno! 🐐`
//   )
//   .addAction(async (ctx, ctxFn) => {
//     const menuFlow = await import("./menu.flow.js").then((mod) => mod.menuFlow);
//     await ctxFn.gotoFlow(menuFlow);
//   });

  // const menuFiestaDelChivo = addKeyword("8") 
  // .addAnswer(
  //   menuTextFiestaDelChivo,
  //   { capture: true },
  //   async (ctx, ctxFn) => {
  //     const opciones = ["1", "2", "3", "4", "5", "6", "0"];
  //     if (!opciones.includes(ctx.body)) {
  //       return ctxFn.fallBack(
  //         "😥 No elegiste una opcion correcta. Elegi 1, 2, 3, 4 o 0"
  //       );
  //     }
  //     if (ctx.body === "0") {
  //       return ctxFn.endFlow(
  //         "🔙 Volviendo al menu principal. Escribi *Menu* para volver a ver las opciones"
  //       );
  //     }
  //   },
  //   [
  //     flowFiestaDelChivo1,
  //     flowFiestaDelChivo2,
  //     flowFiestaDelChivo3,
  //     flowFiestaDelChivo4,
  //   ]
  // );

//   const menuAniversario97 = addKeyword("9") 
//   .addAnswer(
// `🎉 *CELEBRAMOS EL 97° ANIVERSARIO DE PAMPA DEL INFIERNO* 🎉

// 🎶 Te esperamos hoy para disfrutar de un día lleno de actividades, música y alegría.

// ✨ *Entrada: totalmente gratuita.*

// 📍 *Lugar: Predio Ferrocarril.*
// 🕒 *Hora: Desde las 20.50 hs.*

// ¡No te lo pierdas! Te esperamos para celebrar juntos este día tan especial. 🎊

// #PampaDelInfiernoAniversario #EntradaGratuita`
//   )
//   .addAction(async (ctx, ctxFn) => {
//     const menuFlow = await import("./menu.flow.js").then((mod) => mod.menuFlow);
//     await ctxFn.gotoFlow(menuFlow);
//   })
  // .addAnswer(
  //   menuTextAniversario97,
  //   { capture: true },
  //   async (ctx, ctxFn) => {
  //     const opciones = ["1", "2", "3", "4", "5", "6", "0"];
  //     if (!opciones.includes(ctx.body)) {
  //       return ctxFn.fallBack(
  //         "😥 No elegiste una opcion correcta. Elegi 1, 2, 3, 4, 5, 6 o 0"
  //       );
  //     }
  //     if (ctx.body === "0") {
  //       return ctxFn.endFlow(
  //         "🔙 Volviendo al menu principal. Escribi *Menu* para volver a ver las opciones"
  //       );
  //     }
  //   },
  //   [
  //     flowAniversario97,
  //   ]
  // );


  // const menuDesarolloSocial = addKeyword("1") 
  // .addAnswer(
  //   menuTextDesarrolloSoial,
  //   { capture: true },
  //   async (ctx, ctxFn) => {
  //     const opciones = ["1", "2", "3", "4", "5", "6", "0"];
  //     if (!opciones.includes(ctx.body)) {
  //       return ctxFn.fallBack(
  //         "😥 No elegiste una opcion correcta. Elegi 1, 2, 3, 4, 5, 6 o 0"
  //       );
  //     }
  //     if (ctx.body === "0") {
  //       return ctxFn.endFlow(
  //         "🔙 Volviendo al menu principal. Escribi *Menu* para volver a ver las opciones"
  //       );
  //     }
  //   },
  //   [
  // flowDesarrolloSocial1,
  // flowDesarrolloSocial2,
  // flowDesarrolloSocial3,
  // flowDesarrolloSocial4,
  // flowDesarrolloSocial5,
  // flowDesarrolloSocial6,
  //   ]
  // );
  // const flow1 = addKeyword("1") 
  // .addAnswer(
  //   "👀 *Recordá* que para realizar cualquier trámite en Desarrollo Social, vas a necesitar\n🔸 DNI\n🔹 CUIL\n🔸 Clave de Seguridad Social del ANSES\n*(en caso de no tenerlos, te podemos ayudar a gestionarlas)*\n¿En qué te puedo ayudar? 🤗",
  //   { capture: true },
  //   async (ctx, ctxFn) => {
  //     await ctxFn.gotoFlow(gptFlow);
  //   po  // );

// const menuFlow = addKeyword(EVENTS.ACTION).addAnswer(
//   menuText,
//   { capture: true },
//   async (ctx, ctxFn) => {
//     const opciones = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "0"];
//     if (!opciones.includes(ctx.body)) {
//       return ctxFn.fallBack(
//         "😥 No elegiste una opcion correcta. Elegi 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 o 0"
//       );
//     }
//     if (ctx.body === "0") {
//       return ctxFn.endFlow(
//         "🔙 Volviendo al menú principal. ¡Gracias por utilizar Anita ChatBot! Si tienes más preguntas, no dudes en escribir *Menu* para volver a ver las opciones disponibles. ¡Hasta luego!"
//       )
//     }
//   },
//   [menuDesarolloSocial, flow4, flow5, flow6, flow7, 
//     // menuAniversario97,
//     // menuFiestaDelChivo
//     flow10
//    ]
// );

// export { menuFlow, menuDesarolloSocial, 
//   // menuFiestaDelChivo, 
//   // menuAniversario97 
// };
