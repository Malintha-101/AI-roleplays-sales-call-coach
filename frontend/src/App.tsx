
import React, { useState, useRef, useEffect } from 'react';
import { startConversation, sendMessage, endConversation, getConversation, Message } from './services/apiService';
import { MicrophoneIcon, PhoneIcon } from '@heroicons/react/24/solid';

function App() {
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [conversationStarted, setConversationStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Session persistence
  const STORAGE_KEY = 'ai-sales-agent-session';

  // Load existing session on component mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(STORAGE_KEY);
    if (savedSessionId) {
      restoreSession(savedSessionId);
    }
  }, []);

  // Save sessionId to localStorage when it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [sessionId]);

  // Function to restore session from backend
  const restoreSession = async (savedSessionId: string) => {
    setIsRestoring(true);
    try {
      const result = await getConversation(savedSessionId);
      if (result.success && result.data && result.data.conversation.length > 1) {
        // Session exists and has conversation history
        setSessionId(savedSessionId);
        setConversation(result.data.conversation);
        setConversationStarted(true);
        
        // Extract initial text from the conversation (first user message)
        const firstUserMessage = result.data.conversation.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          setInputText(firstUserMessage.content);
        }
      } else {
        // Session doesn't exist or is empty, clean up
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      // Session not found or error, clean up
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsRestoring(false);
    }
  };

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

  // --- Stop voice recording ---
  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    setError('');
    
    // Clear conversation when input changes
    if (conversationStarted) {
      setConversationStarted(false);
      setConversation([]);
      setUserInput('');
      setSessionId('');
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleStartConversation = async () => {
    if (!inputText) return;
    setLoading(true);
    setError('');
    try {
      const result = await startConversation(inputText);
      if (result.success && result.data) {
        setSessionId(result.data.sessionId);
        setConversation(result.data.conversation);
        setConversationStarted(true);
        setUserInput('');
      } else {
        setError(result.error || 'Failed to start conversation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error while starting conversation';
      setError(errorMessage);
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !sessionId) return;
    setChatLoading(true);
    setError('');
    try {
      const result = await sendMessage(sessionId, userInput);
      if (result.success && result.data) {
        setConversation(result.data.conversation);
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error while sending message';
      setError(errorMessage);
    }
    setUserInput('');
    setChatLoading(false);
  };

  const handleEndConversation = async () => {
    if (!sessionId) return;
    try {
      await endConversation(sessionId);
    } catch (err) {
      console.warn('Failed to clean up session:', err);
    }
    // Reset state and clear storage
    setConversationStarted(false);
    setSessionId('');
    setConversation([]);
    setUserInput('');
    setError('');
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-emerald-600 border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center space-x-3">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-400 shadow">
            <PhoneIcon className="w-7 h-7 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">AI Sales Call Practice</h1>
            <p className="text-gray-300 mt-1">Define your buyer persona and practice your sales pitch</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4">
        {isRestoring && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-700 font-medium">Restoring previous conversation...</p>
            </div>
          </div>
        )}

        {!conversationStarted ? (
          /* Persona Setup */
          <div className="flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-7xl min-h-full flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Define Your Buyer Persona</h2>
                <textarea
                  value={inputText}
                  onChange={handleTextChange}
                  placeholder="Define your buyer persona (e.g., 'You are a busy CFO at a Fortune 500 company, very budget-conscious and risk-averse. You require detailed ROI analysis before any purchase decisions.')..."
                  rows={15}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                />
              </div>
              {inputText && (
                <button 
                  onClick={handleStartConversation} 
                  disabled={loading}
                  className="mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center self-end"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Starting...
                    </>
                  ) : (
                    'Start Sales Practice Call'
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sales Practice Call</h3>
                <p className="text-sm text-gray-600">Practice your pitch with your defined buyer persona</p>
              </div>
              <button 
                onClick={handleEndConversation}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                End Call
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {msg.role === 'user' ? 'You (Seller)' : 'Buyer'}
                    </div>
                    <div className="text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-3 rounded-lg">
                    <div className="text-xs font-medium mb-1 opacity-70">Buyer</div>
                    <div className="flex items-center space-x-1">
                      <div className="animate-bounce w-2 h-2 bg-gray-500 rounded-full"></div>
                      <div className="animate-bounce w-2 h-2 bg-gray-500 rounded-full" style={{animationDelay: '0.1s'}}></div>
                      <div className="animate-bounce w-2 h-2 bg-gray-500 rounded-full" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Your sales pitch or response..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                    disabled={chatLoading || isRecording}
                  />
                </div>
                
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={chatLoading}
                  className={`p-3 rounded-lg font-medium transition-colors duration-200 ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  {isRecording ? (
                    <MicrophoneIcon className="w-5 h-5"/>
                  ) : (
                    <MicrophoneIcon className="w-5 h-5"/>
                  )}
                </button>
                
                <button 
                  onClick={handleSendMessage} 
                  disabled={chatLoading || !userInput.trim()}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;