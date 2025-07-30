// Handles receiving and processing the onboard seller's voice input
// Exports: processUserVoice(audioBuffer)


const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function processUserVoice(audioBuffer) {
  // You may need to adjust the file type and name as per your frontend upload
  const response = await openai.audio.transcriptions.create({
    file: audioBuffer,
    model: 'whisper-1',
    response_format: 'text',
    language: 'en'
  });
  return response;
}

module.exports = { processUserVoice };
