import { TechArticle, Concert } from '../types/feeds';

const BACKEND_URL = import.meta.env.VITE_CLOUD_GATEWAY_URL || 'http://localhost:8000/api/v1';

export const feedService = {
  getTechFeeds: async (): Promise<TechArticle[]> => {
    try {
      const response = await fetch(`${BACKEND_URL}/feeds/tech`);
      if (!response.ok) throw new Error('Tech Feed Fetch Failed');
      const data = await response.json();
      return Array.isArray(data) ? data : data.articles ?? [];
    } catch (error) {
      console.error('[FeedService] Tech Error:', error);
      // Return fallback for demo if needed, or rethrow
      return [
        { id: 1, title: "Qwen3.5-9B-Instruct Released", source: "AI Weekly", time: "2h ago", url: "#" },
        { id: 2, title: "Superconductors: New Breakthrough", source: "Science Daily", time: "5h ago", url: "#" }
      ];
    }
  },

  getConcertFeeds: async (): Promise<Concert[]> => {
    try {
      const response = await fetch(`${BACKEND_URL}/feeds/concerts`);
      if (!response.ok) throw new Error('Concert Feed Fetch Failed');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[FeedService] Concert Error:', error);
      return [
        { id: 3, artist: "Hellfire Festival", venue: "Glasgow Central", city: "Glasgow", date: "April 12", ticket_url: "#", genre: "Metal" },
        { id: 4, artist: "The Rocks", venue: "The Liquid Room", city: "Edinburgh", date: "April 20", ticket_url: "#", genre: "Rock" }
      ];
    }
  }
};
