// Handles getting final feedback and ratings from OpenAI
// Exports: getFinalFeedback(conversationHistory, feedbackPoints)


const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Gets final feedback and ratings from OpenAI
 * @param {Array<{role: string, content: string}>} conversationHistory
 * @param {Array<string>} feedbackPoints
 * @returns {Promise<{summary: string, ratings: object}>}
 */
async function getFinalFeedback(conversationHistory, feedbackPoints) {
  const feedbackPrompt = `You are an expert sales coach. Here is the full conversation between a seller and a buyer.\n\nCONVERSATION:\n${conversationHistory.map(m => m.role + ': ' + m.content).join('\n')}\n\nPlease provide a brief summary and rate the seller on the following points (1-5): ${feedbackPoints.join(', ')}. Return your answer as a JSON object with 'summary' and 'ratings' fields.`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert sales coach.' },
      { role: 'user', content: feedbackPrompt }
    ],
    max_tokens: 400,
    temperature: 0.7
  });
  // Try to parse JSON from the AI's reply
  let summary = '', ratings = {};
  try {
    const json = JSON.parse(response.choices[0]?.message?.content || '{}');
    summary = json.summary || '';
    ratings = json.ratings || {};
  } catch (e) {
    summary = response.choices[0]?.message?.content || '';
    ratings = {};
  }
  return { summary, ratings };
}

module.exports = { getFinalFeedback };
