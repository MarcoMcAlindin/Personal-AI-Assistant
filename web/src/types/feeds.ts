export interface TechArticle {
  id?: string | number;
  title: string;
  url: string;
  source: string;
  published_at?: string;
  time?: string; // For display
}

export interface Concert {
  id?: string | number;
  artist: string;
  venue: string;
  city: string;
  date: string;
  ticket_url: string;
  genre?: string;
}

export interface FeedsResponse {
  tech: TechArticle[];
  concerts: Concert[];
}
