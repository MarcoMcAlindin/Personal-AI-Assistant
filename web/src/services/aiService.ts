export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isSaved?: boolean;
}

export const aiService = {
  sendMessage: async (message: string, onToken: (token: string) => void) => {
    console.log('[AIService] Sending message:', message);
    
    // Simulate streaming SSE response
    const mockTokens = [
      "I ", "am ", "VibeOS ", "AI. ", "How ", "can ", "I ", "assist ", "you ", "today?"
    ];

    let fullContent = "";
    for (const token of mockTokens) {
      await new Promise(resolve => setTimeout(resolve, 100));
      fullContent += token;
      onToken(token);
    }

    return { id: crypto.randomUUID(), content: fullContent };
  },

  saveMessage: async (messageId: string) => {
    console.log('[AIService] Pinning message:', messageId);
    // TODO: PATCH /api/v1/chat/save/:id
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }
};
