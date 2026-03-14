import React, { useState, useEffect } from 'react';

const FeedsHub = () => {
    const [feeds, setFeeds] = useState({
        tech: [
            { id: 1, title: "Qwen 3.5 Released", source: "AI Weekly", time: "2h ago" },
            { id: 2, title: "Superconductors: New Breakthrough", source: "Science Daily", time: "5h ago" }
        ],
        concerts: [
            { id: 3, title: "Hellfire Festival @ Glasgow", date: "April 12", genre: "Metal" },
            { id: 4, title: "The Rocks @ Edinburgh", date: "April 20", genre: "Rock" }
        ]
    });

    return (
        <div className="feeds-hub">
            <h1 className="text-accent">Vibe Feeds</h1>
            
            <section style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2>Tech & AI News</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {feeds.tech.map(item => (
                        <div key={item.id} className="card">
                            <h4>{item.title}</h4>
                            <p className="text-muted">{item.source} • {item.time}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2>Scottish Metal & Rock</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {feeds.concerts.map(item => (
                        <div key={item.id} className="card">
                            <h4 className="text-accent">{item.title}</h4>
                            <p className="text-muted">{item.date} • {item.genre}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default FeedsHub;
