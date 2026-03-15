import { API_BASE_URL } from './api';
import { TechArticle, Concert } from '../types/feeds';

export const feedService = {
  getTechFeeds: async (): Promise<TechArticle[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/feeds/tech`);
      if (!response.ok) throw new Error('Tech Feed Fetch Failed');
      return await response.json();
    } catch (error) {
      console.error('[FeedService] Tech Error:', error);
      return [
        { id: 1, title: "Qwen 3.5 Released", source: "AI Weekly", time: "2h ago", url: "#" },
        { id: 2, title: "Superconductors: New Breakthrough", source: "Science Daily", time: "5h ago", url: "#" }
      ];
    }
  },

  getConcertFeeds: async (): Promise<Concert[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/feeds/concerts`);
      if (!response.ok) throw new Error('Concert Feed Fetch Failed');
      return await response.json();
    } catch (error) {
      console.error('[FeedService] Concert Error:', error);
      return [
        { id: 3, artist: "Hellfire Festival", venue: "Glasgow Central", city: "Glasgow", date: "April 12", ticket_url: "#", genre: "Metal" },
        { id: 4, artist: "The Rocks", venue: "The Liquid Room", city: "Edinburgh", date: "April 20", ticket_url: "#", genre: "Rock" }
      ];
    }
  }
};
