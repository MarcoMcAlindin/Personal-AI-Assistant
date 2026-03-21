import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { Menu, Newspaper, TrendingUp, Clock, Music, Calendar, MapPin, ExternalLink } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { BurgerMenu } from "./BurgerMenu";
import { Sidebar } from "./Sidebar";
import { feedService } from "../../services/feedService";
import { TechArticle, Concert } from "../../types/feeds";

export function NewsView() {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tech' | 'concerts'>('tech');
  
  const [techArticles, setTechArticles] = useState<TechArticle[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className={`${isMobile ? 'pt-16 pb-8' : 'pl-64'} min-h-screen`}>
      {!isMobile && <Sidebar />}
      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-12 bg-gradient-to-r from-[#00FFFF] to-transparent rounded-full"></div>
                <span className="text-xs font-semibold text-[#BBC9CD] uppercase tracking-widest">
                  Vibe Feeds
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#DAE2FD] tracking-tight">
                High-Signal Updates
              </h1>
              <p className="text-[#BBC9CD] mt-1">Curated technology news & local concerts</p>
            </div>

            {isMobile && (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-3 rounded-xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-[#BBC9CD] hover:text-[#00FFFF] transition-colors border border-[#00FFFF]/20"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
           <button 
             onClick={() => setActiveTab('tech')}
             className={`px-6 py-3 rounded-xl font-semibold transition-all ${
               activeTab === 'tech' 
                 ? 'bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/50'
                 : 'bg-[#1A1A1A]/50 text-[#BBC9CD] hover:bg-[#1A1A1A] hover:text-white border border-transparent'
             }`}
           >
             Tech & AI
           </button>
           <button 
             onClick={() => setActiveTab('concerts')}
             className={`px-6 py-3 rounded-xl font-semibold transition-all ${
               activeTab === 'concerts' 
                 ? 'bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/50'
                 : 'bg-[#1A1A1A]/50 text-[#BBC9CD] hover:bg-[#1A1A1A] hover:text-white border border-transparent'
             }`}
           >
             Concerts
           </button>
        </div>

        {activeTab === 'tech' && (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <GlassCard className="!p-4 border-[#00FFFF]/20">
               <div className="text-sm text-[#BBC9CD] mb-1">Total Articles</div>
               <div className="text-2xl font-bold text-[#00FFFF]">{techArticles.length}</div>
             </GlassCard>
           </div>
        )}

        <div className="space-y-4">
          {loading ? (
             <div className="text-[#BBC9CD] p-8 text-center text-lg">Loading your vibe...</div>
          ) : activeTab === 'tech' ? (
            techArticles.map((item, id) => (
              <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id || id} className="block group">
                <GlassCard className="!p-6 hover:border-[#00FFFF]/50 hover:bg-[#00FFFF]/5 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-[#00FFFF]/10 flex-shrink-0 group-hover:bg-[#00FFFF]/20 transition-colors">
                      <Newspaper className="w-6 h-6 text-[#00FFFF]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-bold text-[#DAE2FD] text-lg group-hover:text-[#00FFFF] transition-colors">{item.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#BBC9CD]">
                        <span className="font-semibold text-white">{item.source}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.time || item.published_at}
                        </span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </a>
            ))
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {concerts.map((concert, id) => (
                   <GlassCard key={concert.id || id} className="!p-6 hover:border-[#00FFFF]/40 transition-all flex flex-col h-full relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFFF]/5 rounded-bl-[100px] pointer-events-none"></div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#00FFFF]/10">
                          <Music className="w-6 h-6 text-[#00FFFF]" />
                        </div>
                        {concert.genre && (
                           <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20">
                             {concert.genre}
                           </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">{concert.artist}</h3>
                      
                      <div className="space-y-2 mb-6 flex-1">
                        <div className="flex items-center gap-3 text-[#BBC9CD]">
                           <MapPin className="w-4 h-4 text-[#00FFFF]/70" />
                           <span className="text-sm">{concert.venue}, {concert.city}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#BBC9CD]">
                           <Calendar className="w-4 h-4 text-[#00FFFF]/70" />
                           <span className="text-sm">{concert.date}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#00FFFF]/10">
                         <div className="text-xl font-bold text-white tracking-widest">{concert.price || '£--'}</div>
                         <a 
                           href={concert.ticket_url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold hover:bg-[#00FFFF] transition-colors"
                         >
                            <ExternalLink className="w-4 h-4" />
                            Tickets
                         </a>
                      </div>
                   </GlassCard>
                ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}