
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const instructionService = require('./services/instructionService');
const aiReplyService = require('./services/aiReplyService');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Upload PDF endpoint
app.post('/instructions/upload', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Optionally, move/rename file or store path in DB
    res.json({ message: 'File uploaded', filename: req.file.filename });
});

// 2. Extract text from PDF endpoint
app.get('/instructions/extract', async (req, res) => {
    const { filename } = req.query;
    if (!filename) {
        return res.status(400).json({ error: 'Filename required' });
    }
    const filePath = path.join(__dirname, '../uploads', filename);
    console.log('Extract endpoint called. Looking for file:', filePath);
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({ error: 'File not found' });
    }
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        res.json({ text: data.text });
    } catch (err) {
        console.error('Error extracting text from PDF:', err);
        res.status(500).json({ error: 'Failed to extract text', details: err.message });
    }
});

// 3. Send extracted text to OpenAI endpoint
app.post('/instructions/openai', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text required' });
    }
    try {
        // Accept either a string or an array of messages
        let messages;
        if (Array.isArray(text)) {
            messages = text;
        } else {
            messages = [
                { role: 'system', content: 'These are the instructions for the AI.' },
                { role: 'user', content: text }
            ];
        }
        console.log('Calling aiReplyService.getAIReply with:', messages);
        const aiResponse = await aiReplyService.getAIReply(messages);
        res.json({ aiResponse });
    } catch (err) {
        console.error('Error in /instructions/openai:', err);
        res.status(500).json({ error: 'OpenAI request failed', details: err.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
