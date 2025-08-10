require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conversationService = require('./services/conversationService');
const sessionService = require('./services/sessionService');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Process initial text input (simple AI response)
app.post('/api/process-text', async (req, res) => {
    const { text } = req.body;
    
    try {
        const result = await conversationService.processInitialText(text);
        res.json({ 
            success: true, 
            data: result 
        });
    } catch (err) {
        res.status(400).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Start a new conversation session
app.post('/api/conversations', async (req, res) => {
    const { initialText } = req.body;
    
    try {
        const result = await conversationService.startConversation(initialText);
        res.json({ 
            success: true, 
            data: result 
        });
    } catch (err) {
        res.status(400).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Send message in existing conversation
app.post('/api/conversations/:sessionId/messages', async (req, res) => {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    try {
        const result = await conversationService.processMessage(sessionId, message);
        res.json({ 
            success: true, 
            data: result 
        });
    } catch (err) {
        const statusCode = err.message.includes('Session not found') ? 404 : 400;
        res.status(statusCode).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get conversation history
app.get('/api/conversations/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
        const conversation = await sessionService.getConversation(sessionId);
        res.json({ 
            success: true, 
            data: { conversation } 
        });
    } catch (err) {
        res.status(404).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// End conversation session
app.delete('/api/conversations/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
        const result = sessionService.endSession(sessionId);
        res.json({ 
            success: true, 
            data: result 
        });
    } catch (err) {
        res.status(404).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Legacy endpoint for backward compatibility
app.post('/instructions/openai', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text required' });
    }
    try {
        if (Array.isArray(text)) {
            // This is a conversation array - redirect to new API
            return res.status(400).json({ 
                error: 'Please use the new conversation API endpoints',
                suggestion: 'Use POST /api/conversations to start and POST /api/conversations/:sessionId/messages to continue'
            });
        } else {
            // Simple text processing
            const result = await conversationService.processInitialText(text);
            res.json({ aiResponse: { text: result.aiResponse } });
        }
    } catch (err) {
        res.status(500).json({ error: 'OpenAI request failed', details: err.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
