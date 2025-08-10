// Handles sending seller's message to OpenAI and getting the AI buyer's reply
// Using OpenAI Assistants API for persistent conversation threads
// Exports: createThread, addMessageToThread, runAssistant, getThreadMessages

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Pre-configured assistant ID (set this once in your .env)
const DEFAULT_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// Create an assistant (only if you don't have one)
async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: "AI Sales Prospect",
    instructions: "You are a potential buyer/prospect in a sales call. Respond naturally and directly - do not use character names or narrative format. Ask relevant questions, raise typical objections, and respond realistically to sales pitches. Be professional but appropriately challenging.",
    model: "gpt-4o",
  });
  console.log('🤖 Created new assistant:', assistant.id);
  console.log('📝 Add this to your .env file: OPENAI_ASSISTANT_ID=' + assistant.id);
  return assistant.id;
}

// Get or create assistant ID
async function getAssistantId() {
  if (DEFAULT_ASSISTANT_ID && DEFAULT_ASSISTANT_ID !== '') {
    return DEFAULT_ASSISTANT_ID;
  }
  
  console.log('⚠️ No OPENAI_ASSISTANT_ID found in .env, creating new assistant...');
  return await createAssistant();
}

// Create a new conversation thread
async function createThread() {
  const thread = await openai.beta.threads.create();
  console.log('Created OpenAI thread:', thread.id);
  return thread.id;
}

// Add a message to the thread
async function addMessageToThread(threadId, message) {
  console.log('Adding message to thread:', threadId);
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message
  });
  console.log('Message added successfully');
}

// Run the assistant and get response - SIMPLIFIED VERSION (using Chat Completions only)
async function runAssistant(threadId, assistantId = null, persona = null) {
  const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  console.log(`🔵 runAssistant START [${callId}] with threadId:`, threadId);
  
  if (!threadId) {
    throw new Error('Thread ID is required but not provided');
  }

  try {
    // Skip Assistants API entirely and use Chat Completions directly
    console.log('Using Chat Completions API (bypassing Assistants API due to SDK issues)');
    
    // Get current conversation from thread
    let messages = [];
    try {
      messages = await getThreadMessages(threadId);
      console.log(`Conversation length: ${messages.length}`);
    } catch (getMessagesError) {
      console.log('Could not get thread messages, using empty conversation');
      messages = [];
    }
    
    // Build system prompt with persona if provided
    let systemPrompt = 'You are a potential buyer/prospect in a sales call. Respond naturally and directly as yourself - do not use character names or narrative format. Ask relevant questions, raise typical objections, and respond realistically to sales pitches. Be professional but appropriately challenging as a real prospect would be.';
    
    if (persona) {
      systemPrompt += `\n\nIMPORTANT: Your specific character and behavior should be: ${persona}`;
      console.log('Using persona:', persona.substring(0, 100) + '...');
    }
    
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({ role: msg.role, content: msg.content }))
    ];
    
    // Use chat completions
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: chatMessages,
      max_tokens: 200,
      temperature: 0.8
    });
    
    const text = response.choices[0]?.message?.content || '';
    
    // Add the response to the thread
    try {
      await openai.beta.threads.messages.create(threadId, {
        role: "assistant",
        content: text
      });
      console.log('Successfully added response to thread');
    } catch (addMessageError) {
      console.log('Could not add response to thread:', addMessageError.message);
    }
    
    console.log(`🟢 runAssistant CHAT END [${callId}] - returning response`);
    return { text, threadId };
    
  } catch (error) {
    console.error(`🔴 Error in runAssistant [${callId}]:`, error.message);
    throw error;
  }
}

// Get full conversation history from thread
async function getThreadMessages(threadId) {
  try {
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data.reverse().map(msg => ({
      role: msg.role,
      content: msg.content[0].text.value
    }));
  } catch (error) {
    console.error('Error getting thread messages:', error.message);
    
    // If SDK has path parameter issues, return empty conversation
    if (error.message.includes('Path parameters') || error.message.includes('Undefined')) {
      console.warn('SDK issue in getThreadMessages, returning empty conversation');
      return [];
    }
    
    throw error;
  }
}

// Legacy function for backward compatibility (simple text processing)
async function getAIReply(conversationHistory) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationHistory,
      max_tokens: 200,
      temperature: 0.8
    });
    
    const text = response.choices[0]?.message?.content || '';
    if (!text) {
      throw new Error('Empty response from OpenAI');
    }
    
    return { text };
  } catch (error) {
    console.error('OpenAI Chat Completion Error:', error.message);
    throw error;
  }
}

module.exports = { 
  createAssistant,
  getAssistantId,
  createThread, 
  addMessageToThread, 
  runAssistant,
  getThreadMessages,
  getAIReply 
};
