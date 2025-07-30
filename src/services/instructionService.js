// Handles posting the initial instruction to OpenAI and starting the conversation
// Exports: postInstruction(persona, scenario, feedbackPoints)


const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


/**
 * Posts the initial instruction to OpenAI and returns the AI's first reply (text)
 * @param {string} instruction - The full instruction set (persona, scenario, feedback points, etc.)
 * @returns {Promise<{text: string}>}
 */
async function postInstruction(instruction) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful AI roleplaying as a buyer.' },
      { role: 'user', content: instruction }
    ],
    max_tokens: 200,
    temperature: 0.8
  });
  const text = response.choices[0]?.message?.content || '';
  // Optionally, you can add TTS here to generate voice from text
  return { text };
}

module.exports = { postInstruction };
