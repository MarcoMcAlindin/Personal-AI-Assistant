export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

const BACKEND_URL = 'http://localhost:8000/api/v1';

export const aiService = {
  sendMessage: async (message: string, onToken: (token: string) => void) => {
    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user_id: 'ceo_test' })
      });

      if (!response.ok) throw new Error('AI Bridge Failed');

      const data = await response.json();
      const content = data.response;

      // Simulate streaming for the UI since the current backend isn't true SSE yet
      const tokens = content.split(' ');
      let current = "";
      for (const t of tokens) {
        const token = t + " ";
        current += token;
        onToken(token);
        await new Promise(r => setTimeout(r, 50));
      }

      return { id: crypto.randomUUID(), content };
    } catch (error) {
      console.error('[AIService] Bridge Error:', error);
      const errorMsg = "I'm having trouble connecting to my neural core. Please ensure the VibeOS backend is running.";
      onToken(errorMsg);
      return { id: crypto.randomUUID(), content: errorMsg };
    }
  },

  saveMessage: async (messageId: string) => {
    // TODO: Implement save logic in backend
    return { success: true };
  }
};
