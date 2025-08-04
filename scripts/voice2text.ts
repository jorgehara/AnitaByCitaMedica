// import { downloadMediaMessage } from "@adiwajshing/baileys";
// import { OpenAI } from "openai";
// import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
// import ffmpeg, { setFfmpegPath } from "fluent-ffmpeg";
// import { existsSync, createReadStream, mkdirSync, writeFileSync, unlink } from "fs";
// import { join } from 'path';
// setFfmpegPath(ffmpegPath);
// import dotenv from 'dotenv';
// dotenv.config();

// const openaiApiKey = process.env.OPENAI_API_KEY;

// const voiceGPT = async (path) => {
//     if (!existsSync(path)) {
//         throw new Error("No se encuentra el archivo");
//     }
//     try {
//         const openai = new OpenAI({
//             apiKey: openaiApiKey,
//         });
//         const resp = await openai.audio.transcriptions.create({
//             file: createReadStream(path),
//             model: "whisper-1",
//         });
//         return resp.text;
//     } catch (err) {
//         console.log(err);
//         return "Error";
//     }
// };

// const convertOggMp3 = async (inputStream, outStream) => {
//     return new Promise((resolve, reject) => {
//         ffmpeg(inputStream)
//             .audioQuality(96)
//             .toFormat("mp3")
//             .save(outStream)
//             .on("progress", (p) => null)
//             .on("end", () => {
//                 resolve(true);
//             });
//     });
// };

// const voiceToText = async (ctx) => {
//     const buffer = await downloadMediaMessage(ctx, "buffer");
//     // Verificar si la carpeta tmp existe y crearla si no
//     const tmpDir = join(process.cwd(), 'tmp');
//     if (!existsSync(tmpDir)) {
//         mkdirSync(tmpDir);
//     }
//     const pathTmpOgg = `${process.cwd()}/tmp/voice-note-${Date.now()}.ogg`;
//     const pathTmpMp3 = `${process.cwd()}/tmp/voice-note-${Date.now()}.mp3`;
//     await writeFileSync(pathTmpOgg, buffer);
//     await convertOggMp3(pathTmpOgg, pathTmpMp3);
//     const text = await voiceGPT(pathTmpMp3);
//     unlink(pathTmpMp3, (error) => {
//         if (error) throw error;
//     });
//     unlink(pathTmpOgg, (error) => {
//         if (error) throw error;
//     });
//     return text;
// };

// export default { voiceToText };