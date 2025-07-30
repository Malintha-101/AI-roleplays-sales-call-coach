// Handles sending seller's message to OpenAI and getting the AI buyer's reply
// Exports: getAIReply(conversationHistory)


const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Sends conversation history to OpenAI and gets the AI buyer's reply
 * @param {Array<{role: string, content: string}>} conversationHistory
 * @returns {Promise<{text: string}>}
 */
async function getAIReply(conversationHistory) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: conversationHistory,
    max_tokens: 200,
    temperature: 0.8
  });
  const text = response.choices[0]?.message?.content || '';
  // Optionally, you can add TTS here to generate voice from text
  return { text };
}

module.exports = { getAIReply };
