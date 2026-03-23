/// <reference types="vite/client" />

import { supabase } from './supabase';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isSaved?: boolean;
  timestamp?: string;
}

const BACKEND_URL = import.meta.env.VITE_CLOUD_GATEWAY_URL || 'http://localhost:8000/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const aiService = {
  sendMessage: async (message: string, onToken: (token: string) => void): Promise<Message> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message })
      });

      if (!response.ok) throw new Error('AI Bridge Failed');

      // The backend actually returns a stream (SSE) in the real implementation, 
      // but if the endpoint is simple JSON for now, we handle it as such.
      // If it's SSE, we would use an EventSource or a ReadableStream.
      const data = await response.json();
      const content = data.response || data.content || "";

      // For a smooth UI, we still simulate the typing if the backend doesn't stream yet
      // but we do it character-by-character or small chunks for better feel.
      const tokens = content.split(' ');
      for (const t of tokens) {
        onToken(t + " ");
        await new Promise(r => setTimeout(r, 20));
      }

      return { id: crypto.randomUUID(), role: 'assistant', content };
    } catch (error) {
      console.error('[AIService] Bridge Error:', error);
      const errorMsg = "I'm having trouble connecting to my neural core. Please ensure the SuperCyan backend is running.";
      onToken(errorMsg);
      return { id: crypto.randomUUID(), role: 'assistant', content: errorMsg };
    }
  },

  saveMessage: async (messageId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/chat/save/${messageId}`, {
        method: 'PATCH',
        headers,
      });
      return await response.json();
    } catch (error) {
      console.error('[AIService] Save Error:', error);
      throw error;
    }
  }
};
