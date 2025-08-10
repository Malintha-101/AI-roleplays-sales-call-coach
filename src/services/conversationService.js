// Handles conversation flow and message processing
// Exports: startConversation, processMessage, processInitialText

const aiReplyService = require('./aiReplyService');
const sessionService = require('./sessionService');
const validationService = require('./validationService');

async function startConversation(initialText) {
  const convId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  console.log(`🔵 startConversation START [${convId}] with persona: ${initialText.substring(0, 50)}...`);
  
  // Validate initial text
  const validation = validationService.validateTextInput(initialText);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Create new session with OpenAI thread (WITHOUT adding initial text as message)
  const session = await sessionService.createSession();
  
  // Store the persona/behavior instructions for this session
  await sessionService.setPersona(session.sessionId, validation.sanitized);
  
  // Get AI's initial greeting using the persona
  try {
    console.log('Starting conversation with threadId:', session.threadId);
    const aiResponse = await aiReplyService.runAssistant(session.threadId, null, validation.sanitized);
    
    console.log(`🟢 startConversation END [${convId}] - returning response`);
    return {
      sessionId: session.sessionId,
      conversation: await sessionService.getConversation(session.sessionId),
      aiResponse: aiResponse.text
    };
  } catch (error) {
    console.error(`🔴 startConversation ERROR [${convId}]:`, error.message);
    // If AI fails, still return session but with the conversation so far
    return {
      sessionId: session.sessionId,
      conversation: await sessionService.getConversation(session.sessionId),
      error: 'AI response failed: ' + error.message
    };
  }
}

async function processMessage(sessionId, userMessage) {
  const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  console.log(`🔵 processMessage START [${messageId}] for session: ${sessionId}`);
  
  // Validate message
  const validation = validationService.validateMessage(userMessage);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Add user message to OpenAI thread
  await sessionService.addMessage(sessionId, 'user', validation.sanitized);
  
  // Get thread ID for direct OpenAI operations
  const threadId = sessionService.getThreadId(sessionId);
  if (!threadId) {
    throw new Error('Thread not found for session');
  }
  
  // Get AI response using OpenAI Assistant with persona
  try {
    const persona = sessionService.getPersona(sessionId);
    const aiResponse = await aiReplyService.runAssistant(threadId, null, persona);
    
    console.log(`🟢 processMessage END [${messageId}] - returning response`);
    return {
      conversation: await sessionService.getConversation(sessionId),
      aiResponse: aiResponse.text,
      userMessage: validation.sanitized
    };
  } catch (error) {
    console.log(`🔴 processMessage ERROR [${messageId}]:`, error.message);
    throw new Error('AI response failed: ' + error.message);
  }
}

async function processInitialText(text) {
  // Validate text
  const validation = validationService.validateTextInput(text);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Create simple message structure for initial processing
  const messages = [
    { role: 'system', content: 'These are the instructions for the AI.' },
    { role: 'user', content: validation.sanitized }
  ];

  try {
    const aiResponse = await aiReplyService.getAIReply(messages);
    return {
      originalText: validation.sanitized,
      aiResponse: aiResponse.text
    };
  } catch (error) {
    throw new Error('AI response failed: ' + error.message);
  }
}

module.exports = {
  startConversation,
  processMessage,
  processInitialText
};
