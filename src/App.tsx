import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Trash2, ExternalLink, Check, Copy, Tv, Info, Star, AlertTriangle, Skull, Heart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';

interface Show {
  id: number;
  name: string;
  network: string;
  image?: string;
  summary?: string;
  status?: string;
}

interface Subscription {
  user_id: string;
  show_id: number;
  show_name: string;
  network: string;
}

interface Episode {
  showId: number;
  showName: string;
  episodeName: string;
  season: number;
  number: number;
  airDate: string;
  summary: string;
  network: string;
}

export default function App() {
  const [userId, setUserId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Show[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [schedule, setSchedule] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('tvcal_user_id');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('tvcal_user_id', id);
    }
    setUserId(id);
    fetchSubscriptions(id);
    fetchSchedule(id);
  }, []);

  const fetchSubscriptions = async (id: string) => {
    try {
      const res = await fetch(`/api/subscriptions?userId=${id}`);
      const data = await res.json();
      setSubscriptions(data);
    } catch (err) {
      console.error('Failed to fetch subscriptions');
    }
  };

  const fetchSchedule = async (id: string) => {
    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/schedule?userId=${id}`);
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      console.error('Failed to fetch schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const subscribe = async (show: Show) => {
    if (subscriptions.length >= 10) {
      setError("LIMIT REACHED! MAX 10 SHOWS ONLY. 🥀");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          showId: show.id,
          showName: show.name,
          network: show.network
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        setTimeout(() => setError(null), 3000);
        return;
      }

      fetchSubscriptions(userId);
      fetchSchedule(userId);
      setQuery('');
      setResults([]);
    } catch (err) {
      console.error('Subscription failed');
    }
  };

  const unsubscribe = async (showId: number) => {
    try {
      await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, showId })
      });
      fetchSubscriptions(userId);
      fetchSchedule(userId);
    } catch (err) {
      console.error('Unsubscribe failed');
    }
  };

  const icsUrl = userId ? `${window.location.origin}/ics/${userId}` : '';
  const googleCalUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(icsUrl.replace('https://', 'webcal://'))}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(icsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 relative overflow-x-hidden">
      {/* Floating Stickers */}
      <div className="fixed top-20 -left-10 rotate-12 opacity-30 pointer-events-none sticker-float">
        <Skull className="w-40 h-40 text-[#00ffff]" />
      </div>
      <div className="fixed bottom-20 -right-10 -rotate-12 opacity-30 pointer-events-none sticker-float" style={{ animationDelay: '2s' }}>
        <Heart className="w-40 h-40 text-[#8000ff]" />
      </div>

      {/* Emo Marquee */}
      <div className="bg-black border-2 border-[#00ffff] marquee-container py-1 font-retro text-xl text-[#00ffff] uppercase shadow-[0_0_15px_#00ffff]">
        <div className="marquee-content">
          🥀 WELCOME TO MY DARK TWISTED FANTASY... 🥀 SYNC YOUR SHOWS OR WHATEVER... 🥀 I'M NOT OKAY (I PROMISE) 🥀 NO ACCOUNTS 🥀 NO TRACKING 🥀 10 SHOW LIMIT 🥀 RAWR XD 🥀
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Profile & Music Player Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Window */}
          <div className="win98-border shadow-[4px_4px_0_#000] emo-glow border-[#00ffff]">
            <div className="win98-header bg-gradient-to-r from-[#008080] to-[#00ffff]">
              <div className="flex items-center gap-2">
                <Heart className="w-3 h-3" />
                <span>PROFILE.EXE</span>
              </div>
            </div>
            <div className="p-4 flex gap-4 bg-white">
              <div className="w-24 h-24 border-2 border-black bg-stone-200 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/scene/200/200?grayscale" 
                  alt="Profile" 
                  className="w-full h-full object-cover grayscale contrast-125"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="font-bold text-lg leading-none text-[#00ffff] italic">xX_SceneQueen_Xx</h2>
                <p className="text-[10px] font-bold text-stone-500 uppercase">Status: Depressed</p>
                <p className="text-[9px] leading-tight text-stone-700">"TV is the only thing that understands me..."</p>
                <div className="flex gap-1 pt-1">
                  <div className="w-3 h-3 bg-[#00ffff] rounded-full"></div>
                  <div className="w-3 h-3 bg-[#8000ff] rounded-full"></div>
                  <div className="w-3 h-3 bg-[#00ff00] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Music Player Window */}
          <div className="md:col-span-2 win98-border shadow-[4px_4px_0_#000] emo-glow border-[#00ff00]">
            <div className="win98-header bg-black">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#00ff00]" />
                <span className="text-[#00ff00]">WINAMP_EMO_SKIN.MP3</span>
              </div>
            </div>
            <div className="p-4 bg-[#1a1a1a] text-[#00ff00] font-mono text-xs space-y-3">
              <div className="flex justify-between items-center border-b border-[#00ff00]/30 pb-2">
                <div className="flex gap-2 items-center">
                  <div className="w-8 h-8 bg-black border border-[#00ff00] flex items-center justify-center text-[10px]">128</div>
                  <div>
                    <div className="font-bold">My Chemical Romance - Helena</div>
                    <div className="text-[10px] opacity-70">03:24 / 04:22</div>
                  </div>
                </div>
                <div className="flex gap-1 items-end h-8">
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: [10, 24, 15, 30, 12] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-[#00ff00]"
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="win98-button bg-stone-800 text-[#00ff00] border-[#00ff00]/50 text-[10px]">PREV</button>
                <button className="win98-button bg-stone-800 text-[#00ff00] border-[#00ff00]/50 text-[10px]">PLAY</button>
                <button className="win98-button bg-stone-800 text-[#00ff00] border-[#00ff00]/50 text-[10px]">PAUSE</button>
                <button className="win98-button bg-stone-800 text-[#00ff00] border-[#00ff00]/50 text-[10px]">STOP</button>
                <button className="win98-button bg-stone-800 text-[#00ff00] border-[#00ff00]/50 text-[10px]">NEXT</button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Search Window */}
        <div className="win98-border shadow-[8px_8px_0_#000] emo-glow border-[#00ffff]">
          <div className="win98-header bg-gradient-to-r from-[#000080] to-[#0000ff]">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4" />
              <span>TV_CAL_EMO_EDITION.EXE</span>
            </div>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-[#c0c0c0] border border-white/50 flex items-center justify-center text-black text-[10px]">_</div>
              <div className="w-4 h-4 bg-[#c0c0c0] border border-white/50 flex items-center justify-center text-black text-[10px]">□</div>
              <div className="w-4 h-4 bg-[#800000] border border-white/50 flex items-center justify-center text-white text-[10px]">X</div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Emo Hero */}
            <div className="text-center space-y-2 relative">
              <div className="absolute -top-10 -left-10 rotate-12 text-[#ffff00] opacity-50">
                <Zap className="w-20 h-20 fill-[#ffff00]" />
              </div>
              <h1 className="text-5xl md:text-8xl font-retro emo-neon italic tracking-tighter">
                TV CALENDAR
              </h1>
              <p className="text-xs font-bold text-black uppercase bg-[#00ffff] inline-block px-2 py-1">
                Rawr means "I love TV" in dinosaur
              </p>
            </div>

            {/* Search */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="SEARCH FOR A SHOW... IF YOU CARE..."
                  className="flex-1 bg-white border-2 border-black p-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#00ffff]/20 placeholder:text-stone-400"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="win98-button font-bold px-6 bg-[#00ffff] text-black hover:brightness-110">
                  SEARCH
                </button>
              </div>

              <AnimatePresence>
                {results.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {results.map((show) => (
                      <div key={show.id} className="win98-border p-3 space-y-3 flex flex-col bg-[#f0f0f0] border-[#00ffff]">
                        {show.image ? (
                          <img src={show.image} alt={show.name} className="w-full h-40 object-cover border border-black grayscale hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-40 bg-stone-300 border border-black flex items-center justify-center">
                            <Tv className="w-10 h-10 text-stone-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-sm leading-tight">{show.name}</h3>
                          <p className="text-[10px] font-bold text-[#800080] uppercase">{show.network}</p>
                        </div>
                        <button
                          onClick={() => subscribe(show)}
                          disabled={subscriptions.some(s => s.show_id === show.id)}
                          className="win98-button w-full py-1 font-bold text-xs bg-[#00ffff] text-black disabled:bg-stone-400 disabled:text-stone-200"
                        >
                          {subscriptions.some(s => s.show_id === show.id) ? 'FOLLOWING' : 'ADD +'}
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="bg-black text-[#00ffff] p-3 border-2 border-[#00ffff] flex items-center gap-3 font-bold text-xs">
                <AlertTriangle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          {/* Subscriptions List */}
          <div className="lg:col-span-2 win98-border shadow-[8px_8px_0_#000] border-[#ffff00]">
            <div className="win98-header bg-gradient-to-r from-[#808000] to-[#ffff00] text-black">
              <span>MY_SUBSCRIPTIONS.TXT</span>
              <span>{subscriptions.length}/10</span>
            </div>
            <div className="p-4 space-y-2 bg-white min-h-[200px]">
              {subscriptions.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs italic">
                  NOTHING HERE... JUST LIKE MY HEART...
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div key={sub.show_id} className="border border-black p-2 flex items-center justify-between bg-stone-50 hover:bg-[#00ffff]/10">
                    <div className="flex items-center gap-3">
                      <Heart className="w-3 h-3 text-[#00ffff] fill-[#00ffff]" />
                      <div>
                        <div className="font-bold text-xs">{sub.show_name}</div>
                        <div className="text-[9px] font-bold text-stone-500 uppercase">{sub.network}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => unsubscribe(sub.show_id)}
                      className="win98-button p-1 hover:bg-black hover:text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Calendar/Schedule Window */}
          <div className="lg:col-span-4 win98-border shadow-[8px_8px_0_#000] border-[#00ff00]">
            <div className="win98-header bg-gradient-to-r from-[#008000] to-[#00ff00] text-black">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>CALENDAR.EXE</span>
              </div>
            </div>
            <div className="p-4 bg-white min-h-[300px] space-y-4">
              {scheduleLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-[#00ffff] border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-xs text-[#00ffff]">LOADING REALITY...</p>
                </div>
              ) : schedule.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <Tv className="w-12 h-12 mx-auto text-stone-300" />
                  <p className="text-stone-400 text-xs italic">NO UPCOMING EPISODES... THE VOID IS EMPTY...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group by date? For now just list */}
                  {schedule.map((ep, idx) => (
                    <div key={`${ep.showId}-${idx}`} className="border-l-4 border-[#00ffff] pl-4 py-1 space-y-1 relative group">
                      <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#00ffff] rounded-full group-hover:bg-[#00ffff] transition-colors" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold bg-[#ffff00] text-black px-1 uppercase">
                            {new Date(ep.airDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="ml-2 text-[10px] font-bold text-stone-500">
                            {new Date(ep.airDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-[#00ffff] uppercase">{ep.network}</span>
                      </div>
                      <h4 className="font-bold text-sm">{ep.showName}</h4>
                      <p className="text-xs text-stone-600">
                        S{ep.season}E{ep.number}: <span className="italic">"{ep.episodeName}"</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sync Box */}
        <div className="win98-border shadow-[8px_8px_0_#000] bg-black text-white border-[#00ffff]">
          <div className="win98-header bg-gradient-to-r from-[#008080] to-[#00ffff] text-black">SYNC_WIZARD.EXE</div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h2 className="text-4xl font-retro emo-neon">SYNC IT</h2>
              <p className="text-xs font-bold text-stone-400 uppercase leading-relaxed">
                COPY THE LINK OR ADD TO GOOGLE CALENDAR. WHATEVER. IT WORKS NOW, I PROMISE. 🥀
              </p>
              <div className="flex gap-2 p-1 bg-[#222] border border-[#00ffff]/30">
                <div className="flex-1 px-2 py-2 text-[10px] font-mono break-all text-[#00ffff] overflow-hidden">
                  {icsUrl || 'ADD SHOWS FIRST...'}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="win98-button bg-white text-black px-4 font-bold text-[10px] hover:bg-[#00ffff] hover:text-white shrink-0"
                >
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </div>
            
            <div className="flex flex-col justify-center gap-4">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="win98-button bg-[#00ffff] text-black py-4 font-bold text-lg flex items-center justify-center gap-3 hover:brightness-110 shadow-[4px_4px_0_#008080]"
              >
                <Calendar className="w-6 h-6" />
                ADD TO GOOGLE CALENDAR
              </a>
              <p className="text-[9px] text-center text-stone-500 italic">
                * Note: Google Calendar may take up to 24 hours to refresh. Don't blame me.
              </p>
            </div>
          </div>
        </div>

        {/* Emo Footer */}
        <div className="text-center py-12 space-y-6">
          <div className="flex justify-center gap-4">
            <div className="bg-black text-[#00ffff] px-6 py-2 font-retro text-2xl border-2 border-[#00ffff] shadow-[4px_4px_0_#00ffff]">
              SCENE_POINTS: 0001337
            </div>
          </div>
          <div className="flex justify-center gap-8 text-xs font-bold text-[#00ffff] uppercase tracking-[0.2em]">
            <span className="hover:text-[#00ffff] cursor-help">No Tracking</span>
            <span className="hover:text-[#00ff00] cursor-help">No Ads</span>
            <span className="hover:text-[#ffff00] cursor-help">Just Pain</span>
          </div>
          <div className="flex justify-center gap-4 grayscale hover:grayscale-0 transition-all">
             <img src="https://picsum.photos/seed/emo1/88/31" alt="88x31" referrerPolicy="no-referrer" className="border border-white/20" />
             <img src="https://picsum.photos/seed/emo2/88/31" alt="88x31" referrerPolicy="no-referrer" className="border border-white/20" />
             <img src="https://picsum.photos/seed/emo3/88/31" alt="88x31" referrerPolicy="no-referrer" className="border border-white/20" />
             <img src="https://picsum.photos/seed/emo4/88/31" alt="88x31" referrerPolicy="no-referrer" className="border border-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
