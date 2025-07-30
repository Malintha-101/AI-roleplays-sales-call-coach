require('dotenv').config();

const fs = require('fs');
const { OpenAI } = require('openai');
const { postInstruction } = require('./src/services/instructionService');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const instruction = `
Persona:
Name: John Doe
Age: 35
Location: New York
Psychological behavior: Analytical, skeptical
Financial state: Middle class
Occupation: IT Manager

Scenario:
Type: Cold call
Interrupt frequency: Low

At the end, provide feedback on: rapport building, product explanation, objection handling, closing.

Start the conversation as the buyer.
`;

async function textToSpeech(text, filename = 'output.mp3') {
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    input: text,
    voice: 'alloy', // You can use: alloy, echo, fable, onyx, nova, shimmer
    response_format: 'mp3'
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filename, buffer);
  console.log(`Voice file saved as ${filename}`);
}

postInstruction(instruction)
  .then(async res => {
    console.log('AI Reply:', res.text);
    await textToSpeech(res.text); // Convert reply to voice and save as output.mp3
  })
  .catch(err => {
    console.error('Error:', err);
  });
