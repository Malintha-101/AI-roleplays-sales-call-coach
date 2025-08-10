// API service for AI Sales Agent frontend
// Centralized API calls to backend

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// API response type
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Message type
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// API service class
class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Process initial text input (simple AI response)
  async processText(text: string): Promise<ApiResponse<{
    originalText: string;
    aiResponse: string;
  }>> {
    return this.makeRequest('/api/process-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Start a new conversation session
  async startConversation(initialText: string): Promise<ApiResponse<{
    sessionId: string;
    conversation: Message[];
    aiResponse: string;
  }>> {
    return this.makeRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ initialText }),
    });
  }

  // Send message in existing conversation
  async sendMessage(sessionId: string, message: string): Promise<ApiResponse<{
    conversation: Message[];
    aiResponse: string;
    userMessage: string;
  }>> {
    return this.makeRequest(`/api/conversations/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Get conversation history
  async getConversation(sessionId: string): Promise<ApiResponse<{
    conversation: Message[];
  }>> {
    return this.makeRequest(`/api/conversations/${sessionId}`, {
      method: 'GET',
    });
  }

  // End conversation session
  async endConversation(sessionId: string): Promise<ApiResponse<{
    message: string;
  }>> {
    return this.makeRequest(`/api/conversations/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Legacy endpoint for backward compatibility
  async sendToOpenAI(text: string): Promise<ApiResponse<{
    aiResponse: { text: string };
  }>> {
    return this.makeRequest('/instructions/openai', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export individual methods for convenience with proper binding
export const processText = (text: string) => apiService.processText(text);
export const startConversation = (initialText: string) => apiService.startConversation(initialText);
export const sendMessage = (sessionId: string, message: string) => apiService.sendMessage(sessionId, message);
export const getConversation = (sessionId: string) => apiService.getConversation(sessionId);
export const endConversation = (sessionId: string) => apiService.endConversation(sessionId);
export const sendToOpenAI = (text: string) => apiService.sendToOpenAI(text);
