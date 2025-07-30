
import React, { useState, useRef, useEffect } from 'react';
import './App.css';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function App() {
  // --- Stop voice recording ---
  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };
  // --- State ---
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  // --- Voice output (AI reply) ---
  useEffect(() => {
    if (!conversationStarted) return;
    if (conversation.length === 0) return;
    const lastMsg = conversation[conversation.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.content) {
      // Cancel any ongoing speech before speaking new reply
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(lastMsg.content);
      window.speechSynthesis.speak(utter);
    }
  }, [conversation, conversationStarted]);


  // --- Voice input: start/stop recording and handle result ---
  const handleStartRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript);
      setIsRecording(false);
      // If in conversation mode, send the message automatically
      if (conversationStarted) {
        setTimeout(() => {
          handleSendMessage();
        }, 100); // slight delay to ensure state updates
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again and speak clearly into your microphone.');
      } else {
        setError('Speech recognition error: ' + event.error);
      }
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setFilename('');
      setExtractedText('');
      setAiResponse('');
      setError('');
      setConversationStarted(false);
      setConversation([]);
      setUserInput('');
    }
  };

  const handleUpload = async () => {
    if (!pdfFile) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    try {
      const res = await fetch('/instructions/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.filename) {
        setFilename(data.filename);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload error');
    }
    setLoading(false);
  };

  const handleExtract = async () => {
    if (!filename) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/instructions/extract?filename=${filename}`);
      const data = await res.json();
      if (data.text) {
        setExtractedText(data.text);
      } else {
        setError(data.error || 'Extraction failed');
      }
    } catch (err) {
      setError('Extraction error');
    }
    setLoading(false);
  };

  const handleSendToAI = async () => {
    if (!extractedText) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/instructions/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText }),
      });
      const data = await res.json();
      if (data.aiResponse) {
        setAiResponse(data.aiResponse.text);
      } else {
        setError(data.error || 'AI request failed');
      }
    } catch (err) {
      setError('AI request error');
    }
    setLoading(false);
  };

  const handleStartConversation = () => {
    setConversationStarted(true);
    setConversation([
      { role: 'system', content: 'You are an AI sales call coach. Respond as the buyer and provide feedback as needed.' },
      { role: 'user', content: extractedText || 'Start the conversation as the buyer.' }
    ]);
    setUserInput('');
    setAiResponse('');
    setError('');
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    const updatedConversation: Message[] = [...conversation, { role: 'user', content: userInput }];
    setConversation(updatedConversation);
    setChatLoading(true);
    setError('');
    try {
      const res = await fetch('/instructions/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: updatedConversation }),
      });
      const data = await res.json();
      if (data.aiResponse && data.aiResponse.text) {
        setConversation([...updatedConversation, { role: 'assistant', content: data.aiResponse.text }]);
      } else {
        setError(data.error || 'AI request failed');
      }
    } catch (err) {
      setError('AI request error');
    }
    setUserInput('');
    setChatLoading(false);
  };

  return (
    <div className="App" style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h2>Instruction PDF Uploader</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!pdfFile || loading} style={{ marginLeft: 8 }}>
        Upload PDF
      </button>
      <br /><br />
      {filename && (
        <>
          <div>Uploaded as: <b>{filename}</b></div>
          <button onClick={handleExtract} disabled={loading} style={{ marginTop: 8 }}>
            Extract Text
          </button>
        </>
      )}
      <br />
      {extractedText && (
        <>
          <h4>Extracted Text</h4>
          <textarea value={extractedText} readOnly rows={8} style={{ width: '100%' }} />
          <button onClick={handleSendToAI} disabled={loading} style={{ marginTop: 8 }}>
            Send to OpenAI
          </button>
        </>
      )}
      <br />
      {aiResponse && (
        <>
          <h4>OpenAI Response</h4>
          <textarea value={aiResponse} readOnly rows={6} style={{ width: '100%' }} />
        </>
      )}

      {/* Start Conversation Button and Chat UI */}
      {!conversationStarted && extractedText && (
        <button onClick={handleStartConversation} style={{ marginTop: 24 }}>
          Start Conversation
        </button>
      )}

      {conversationStarted && (
        <div style={{ marginTop: 32, border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
          <h3>Conversation</h3>
          <div style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 12, background: '#fafafa', padding: 8, borderRadius: 4 }}>
            {conversation.map((msg, idx) => (
              <div key={idx} style={{ margin: '8px 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <b>{msg.role === 'user' ? 'You' : (msg.role === 'assistant' ? 'AI' : 'System')}:</b> {msg.content}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
              placeholder="Type your message or use the mic..."
              style={{ flex: 1 }}
              disabled={chatLoading || isRecording}
            />
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={chatLoading}
              style={{ background: isRecording ? '#f66' : undefined }}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? 'Stop' : '🎤'}
            </button>
            <button onClick={handleSendMessage} disabled={chatLoading || !userInput.trim()}>
              Send
            </button>
          </div>
          {chatLoading && <div>Waiting for AI response...</div>}
        </div>
      )}
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      {loading && <div>Loading...</div>}
    </div>
  );
}

export default App;