import React, { useState, useEffect } from 'react';
import { feedService } from '../../services/feedService';
import { TechArticle, Concert } from '../../types/feeds';
import './Feeds.css';

const FeedsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tech' | 'concerts'>('tech');
  const [techArticles, setTechArticles] = useState<TechArticle[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'tech') {
          const data = await feedService.getTechFeeds();
          setTechArticles(data);
        } else {
          const data = await feedService.getConcertFeeds();
          setConcerts(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="feeds-container">
      <header className="feeds-header">
        <h1 className="text-accent glow-text">Vibe Feeds</h1>
        <div className="tabs-navigation">
          <button 
            className={`tab-btn ${activeTab === 'tech' ? 'active' : ''}`}
            onClick={() => setActiveTab('tech')}
          >
            Tech & AI
          </button>
          <button 
            className={`tab-btn ${activeTab === 'concerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('concerts')}
          >
            Scottish Concerts
          </button>
        </div>
      </header>

      <main className="feeds-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p className="text-muted">Fetching high-signal data...</p>
          </div>
        ) : (
          <div className="feed-list animate-in">
            {activeTab === 'tech' ? (
              techArticles.map((article, idx) => (
                <a key={article.id || idx} href={article.url} target="_blank" rel="noopener noreferrer" className="feed-card-link">
                  <div className="card feed-card">
                    <div className="card-accent"></div>
                    <div className="card-content">
                      <h3>{article.title}</h3>
                      <div className="card-meta">
                        <span className="source-tag">{article.source}</span>
                        <span className="time-tag text-muted">{article.time || article.published_at}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))
            ) : (
              concerts.map((concert, idx) => (
                <a key={concert.id || idx} href={concert.ticket_url} target="_blank" rel="noopener noreferrer" className="feed-card-link">
                  <div className="card feed-card concert-card">
                    <div className="card-accent secondary"></div>
                    <div className="card-content">
                      <h3>{concert.artist}</h3>
                      <div className="card-meta">
                        <span className="venue-tag text-accent">{concert.venue}</span>
                        <span className="city-tag text-muted">{concert.city}</span>
                        <span className="date-tag text-muted">{concert.date}</span>
                      </div>
                      {concert.genre && <span className="genre-tag">{concert.genre}</span>}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default FeedsHub;
