import React, { useState, useEffect } from 'react';
import { feedService } from '../../services/feedService';
import { TechArticle, Concert } from '../../types/feeds';
import './Feeds.css';

const FeedsHub = (): JSX.Element => {
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
        // Fallback to mock data for demonstration if API fails
        if (activeTab === 'concerts') {
          setConcerts([
            { id: 1, artist: 'Gojira', venue: 'Barrowland Ballroom', city: 'Glasgow', date: 'Mar 28, 2026', genre: 'Progressive Metal', price: '£45', ticket_url: '#' },
            { id: 2, artist: 'Architects', venue: 'O2 Academy', city: 'Glasgow', date: 'Apr 5, 2026', genre: 'Metalcore', price: '£38', ticket_url: '#' },
            { id: 3, artist: 'Mastodon', venue: 'Usher Hall', city: 'Edinburgh', date: 'Apr 12, 2026', genre: 'Progressive Metal', price: '£52', ticket_url: '#' },
            { id: 4, artist: 'Sleep Token', venue: 'SWG3', city: 'Glasgow', date: 'Apr 20, 2026', genre: 'Alternative Metal', price: '£40', ticket_url: '#' },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="feeds-container">
      <header className="feeds-header">
        <div className="feeds-title-group">
          <div className="feeds-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
              <path d="M4 11a9 9 0 0 1 9 9"></path>
              <path d="M4 4a16 16 0 0 1 16 16"></path>
              <circle cx="5" cy="19" r="1"></circle>
            </svg>
          </div>
          <div className="feeds-info">
            <h1>Vibe Feeds</h1>
            <span className="feeds-subtitle">High-signal updates curated for you</span>
          </div>
        </div>

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
            Concerts
          </button>
        </div>
      </header>

      <main className="feeds-content">
        {activeTab === 'concerts' && (
          <div className="concert-header-row animate-in">
            <div className="concert-main-info">
              <div className="concert-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </div>
              <div className="concert-title-stack">
                <h2>Scotland Concerts</h2>
                <div className="concert-genres">
                  <span>Metal</span>
                  <span className="dot-separator">Rock</span>
                  <span className="dot-separator">Hard Rock</span>
                </div>
              </div>
            </div>
            <div className="view-toggle">
              <button className="toggle-btn active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <circle cx="3" cy="6" r="1"></circle>
                  <circle cx="3" cy="12" r="1"></circle>
                  <circle cx="3" cy="18" r="1"></circle>
                </svg>
              </button>
              <button className="toggle-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <p className="text-muted">Loading your vibe...</p>
          </div>
        ) : (
          <div className="feed-list animate-in">
            {activeTab === 'tech' ? (
              techArticles.map((article, idx) => (
                <a key={article.id || idx} href={article.url} target="_blank" rel="noopener noreferrer" className="feed-card-link" style={{ textDecoration: 'none' }}>
                  <div className="card feed-card" style={{ display: 'flex', gap: 'var(--spacing-md)', padding: 'var(--spacing-lg)' }}>
                    <div className="card-content">
                      <h3 style={{ marginBottom: '8px' }}>{article.title}</h3>
                      <div className="card-meta" style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                        <span className="source-tag text-accent" style={{ fontWeight: 600 }}>{article.source}</span>
                        <span className="time-tag text-muted">{article.time || article.published_at}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))
            ) : (
              concerts.map((concert, idx) => (
                <div key={concert.id || idx} className="concert-card">
                  <div className="concert-left">
                    <h3 className="artist-name">{concert.artist}</h3>
                    <div className="venue-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {concert.venue}, {concert.city}
                    </div>
                    <div className="concert-tags">
                      <div className="tag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginRight: 4 }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {concert.date}
                      </div>
                      {concert.genre && <div className="tag accent">{concert.genre}</div>}
                    </div>
                  </div>
                  <div className="concert-right">
                    <span className="price-tag">{concert.price || '£--'}</span>
                    <a href={concert.ticket_url} target="_blank" rel="noopener noreferrer" className="ticket-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path>
                        <line x1="13" y1="5" x2="13" y2="19"></line>
                      </svg>
                      Tickets
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default FeedsHub;
