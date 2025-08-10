// Handles conversation sessions using OpenAI Threads for storage
// Exports: createSession, addMessage, getConversation, endSession

const aiReplyService = require('./aiReplyService');

// Store minimal session data (only sessionId -> threadId mapping)
const sessionStore = new Map();
// Store persona/behavior instructions for each session
const personaStore = new Map();

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function createSession(initialText = '') {
  const sessionId = generateSessionId();
  
  // Create OpenAI thread for conversation storage
  const threadId = await aiReplyService.createThread();
  
  const session = {
    id: sessionId,
    threadId: threadId,
    started: Date.now(),
    lastActivity: Date.now()
  };

  // Do NOT add initial text as a message anymore - it's now used for persona
  sessionStore.set(sessionId, session);
  
  // Get conversation from OpenAI thread (this is the source of truth)
  const conversation = await aiReplyService.getThreadMessages(threadId);
  
  console.log('Session created:', { sessionId, threadId, conversationLength: conversation.length });
  
  return {
    sessionId,
    threadId,
    conversation
  };
}

async function addMessage(sessionId, role, content) {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.lastActivity = Date.now();

  if (role === 'user') {
    // Add user message to OpenAI thread
    await aiReplyService.addMessageToThread(session.threadId, content);
  }
  // Note: Assistant messages are added automatically by runAssistant
  
  // Get updated conversation from OpenAI thread
  const conversation = await aiReplyService.getThreadMessages(session.threadId);
  
  return {
    conversation,
    message: { role, content }
  };
}

async function getConversation(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.lastActivity = Date.now();
  
  // Get conversation from OpenAI thread (source of truth)
  return await aiReplyService.getThreadMessages(session.threadId);
}

function endSession(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Remove session mapping (OpenAI thread persists)
  sessionStore.delete(sessionId);
  console.log('Session ended, OpenAI thread persists:', session.threadId);
  return { message: 'Session ended successfully' };
}

// Get thread ID for direct OpenAI operations
function getThreadId(sessionId) {
  const session = sessionStore.get(sessionId);
  return session ? session.threadId : null;
}

// Cleanup old sessions (OpenAI threads persist even after cleanup)
function cleanupOldSessions() {
  const maxAge = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (now - session.lastActivity > maxAge) {
      console.log('Cleaning up old session:', sessionId, 'Thread persists:', session.threadId);
      sessionStore.delete(sessionId);
      personaStore.delete(sessionId); // Also cleanup persona
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldSessions, 10 * 60 * 1000);

// Persona management functions
function setPersona(sessionId, persona) {
  personaStore.set(sessionId, persona);
  console.log('Persona set for session:', sessionId);
}

function getPersona(sessionId) {
  return personaStore.get(sessionId) || null;
}

module.exports = {
  createSession,
  addMessage,
  getConversation,
  endSession,
  getThreadId,
  setPersona,
  getPersona
};
