import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';  // ← ADD THIS LINE
import { ArrowLeftIcon, ChevronRightIcon, HistoryIcon } from './Icons';
import { AnalysisResult, HistoryEntry } from '../types';
import { supabase } from '../lib/supabase';
import { getStyleSummary, StyleSummary } from '../utils/styleInsights';

interface ExtendedHistoryEntry extends HistoryEntry {
  occasion?: string;
}

interface HistoryPageProps {
  onBack: () => void;
  // UPDATE THIS LINE: Add outfitId (string) and analyzedAt (string)
  onSelect: (item: AnalysisResult, imageUrl: string, outfitId: string, analyzedAt: string) => void;
  streak?: number;
  session: Session | null;
}


export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, onSelect, streak = 0, session }) => {
const [historyItems, setHistoryItems] = useState<ExtendedHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  // Category filter state
  const [activeFilter, setActiveFilter] = useState<string>('All');
  // Time filter state
  const [activeTimeFilter, setActiveTimeFilter] = useState<string>('All Time');
  // Style insights state
  const [styleSummary, setStyleSummary] = useState<StyleSummary | null>(null);
  // Sort order state
  const [sortOrder, setSortOrder] = useState<'latest' | 'highest' | 'lowest'>('latest');
  
  // Filters dropdown state - CHANGED TO FALSE DEFAULT
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Preset occasions - must match database values exactly
  const PRESET_OCCASIONS = ['Casual', 'Work', 'Date', 'Party', 'Event'];
  const FILTER_OPTIONS = ['All', ...PRESET_OCCASIONS, 'Custom Occasion'];
  const TIME_FILTER_OPTIONS = ['All Time', 'This Week', 'This Month', 'Last Month'];

  useEffect(() => {
    window.scrollTo(0, 0);

    // Check for manual navigation trigger from the history button
    const trigger = localStorage.getItem('fitcheckai_trigger_history_animation') === 'true';
    if (trigger) {
      setShouldAnimate(true);
      localStorage.removeItem('fitcheckai_trigger_history_animation');
    }

    const fetchHistory = async () => {
      try {
        setIsLoading(true);

        const user = session?.user;

        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('OutfitData')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const items: ExtendedHistoryEntry[] = (data || []).map((row: any) => ({
  id: row.id_uuid, // CHANGED: Use id_uuid to match App.tsx expectation
  timestamp: row.created_at,
  imageUrl: row.image_url,
          score: row.score,
          alignment: row.score >= 80 ? 'STRONG ALIGNMENT' : row.score >= 50 ? 'MODERATE ALIGNMENT' : 'LOW ALIGNMENT',
          comparison: '0',
          data: row.insight as AnalysisResult,
          occasion: row.title
        }));

        const summary = getStyleSummary(items);
        console.log('STYLE SUMMARY:', summary);

        if (trigger && items.length > 0) {
          setIsTransitioning(true);
          setTimeout(() => {
            setIsTransitioning(false);
            setHistoryItems(items);
            setStyleSummary(summary);
            setIsLoading(false);
          }, 500);
        } else {
          setHistoryItems(items);
          setStyleSummary(summary);
          setIsLoading(false);
        }

      } catch (e) {
        console.error('History fetch failed:', e);
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [session]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper functions for time filtering
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getMonthStart = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getMonthEnd = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  };

  const isDateInRange = (dateString: string, filter: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();

    switch (filter) {
      case 'All Time': return true;
      case 'This Week': {
        const weekStart = getWeekStart(now);
        weekStart.setHours(0, 0, 0, 0);
        return date >= weekStart;
      }
      case 'This Month': {
        const monthStart = getMonthStart(now);
        monthStart.setHours(0, 0, 0, 0);
        return date >= monthStart;
      }
      case 'Last Month': {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStart = getMonthStart(lastMonthDate);
        const lastMonthEnd = getMonthEnd(lastMonthDate);
        lastMonthStart.setHours(0, 0, 0, 0);
        return date >= lastMonthStart && date <= lastMonthEnd;
      }
      default: return true;
    }
  };

  // Derive filtered and sorted history
  const filteredHistory = historyItems
    .filter((item) => {
      // Step 1: Time filter
      if (!isDateInRange(item.timestamp, activeTimeFilter)) return false;

      // Step 2: Category filter
      if (activeFilter === 'All') return true;
      const occasion = item.occasion || 'Custom Occasion';
      if (activeFilter === 'Custom Occasion') {
        return !PRESET_OCCASIONS.includes(occasion);
      }
      return occasion === activeFilter;
    })
    .sort((a, b) => {
      // Step 3: Sort order
      if (sortOrder === 'highest') return b.score - a.score;
      if (sortOrder === 'lowest') return a.score - b.score;
      return 0;
    });

  const handleCardClick = (item: HistoryEntry) => {
  onSelect(item.data, item.imageUrl, item.id, item.timestamp);
};

  const getScoreColor = (score: number) => {
    return score >= 80 ? 'text-classik-dark' : 'text-classik-warm';
  };

  const getContextWord = (score: number) => {
    if (score >= 95) return "Iconic";
    if (score >= 85) return "Strong";
    if (score >= 75) return "Clean";
    if (score >= 65) return "Balanced";
    if (score >= 50) return "Developing";
    return "Unstable";
  };

  return (
    <div className="min-h-screen w-full bg-classik-beige text-classik-black animate-fade-in pb-20 overflow-y-auto no-scrollbar font-manrope selection:bg-classik-dark/20">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-classik-beige/90 backdrop-blur-xl border-b border-classik-black/5 transition-all duration-300">
        <div className="max-w-md mx-auto px-6 py-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/60 text-classik-black/70 hover:bg-white/60 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-[12px] font-black tracking-[0.3em] uppercase text-classik-black/80">
              Style Journal
            </h1>

            <button
  onClick={() => setFiltersOpen(v => !v)}
  className={`
    flex items-center gap-2 px-4 py-2 rounded-full
    text-[9px] font-black uppercase tracking-[0.35em]
    transition-all duration-600
    backdrop-blur-xl border
    ${
      filtersOpen
        ? 'bg-white/60 border-white/70 text-classik-dark shadow-sm'
        : 'bg-white/30 border-white/50 text-classik-black/60'
    }
    hover:bg-white/50
    active:scale-95
  `}
>
  <span>SORT & FILTER</span>

  <span
    className={`transition-transform duration-400 ${
      filtersOpen ? 'rotate-180' : 'rotate-0'
    }`}
  >
    ▼
  </span>
</button>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* COLLAPSIBLE FILTER PANEL */}
      {!isLoading && historyItems.length > 0 && (
        <div 
          className={`grid transition-[grid-template-rows,opacity,padding] duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] border-b border-classik-black/5 bg-classik-beige/50
            ${filtersOpen 
              ? 'grid-rows-[1fr] opacity-100' 
              : 'grid-rows-[0fr] opacity-0 pointer-events-none border-none'
            }
          `}
        >
          <div className="overflow-hidden min-h-0">
            <div className="pb-6 pt-2 flex flex-col gap-1">
              
              {/* ROW 1: TIME FILTER */}
              <div className="overflow-x-auto no-scrollbar">
                <div className="max-w-md mx-auto px-6 py-3 flex gap-2">
                  {TIME_FILTER_OPTIONS.map((filter) => {
                    const isActive = activeTimeFilter === filter;
                    return (
                      <button
                        key={filter}
                        onClick={() => setActiveTimeFilter(filter)}
                        className={`
                          flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300
                          ${isActive
                            ? 'bg-classik-warm text-white shadow-md'
                            : 'bg-white/40 text-classik-black/50 border border-white/60 hover:bg-white/60 active:scale-95'
                          }
                        `}
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ROW 2: CATEGORY FILTER */}
              <div className="overflow-x-auto no-scrollbar">
                <div className="max-w-md mx-auto px-6 py-3 flex gap-2">
                  {FILTER_OPTIONS.map((filter) => {
                    const isActive = activeFilter === filter;
                    // Apply time filter first, then count categories
                    const timeFilteredItems = historyItems.filter(item =>
                      isDateInRange(item.timestamp, activeTimeFilter)
                    );

                    const count = filter === 'All'
                      ? timeFilteredItems.length
                      : filter === 'Custom Occasion'
                        ? timeFilteredItems.filter(item => {
                          const occasion = item.occasion || 'Custom Occasion';
                          return !PRESET_OCCASIONS.includes(occasion);
                        }).length
                        : timeFilteredItems.filter(item => item.occasion === filter).length;

                    return (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`
                          flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300
                          ${isActive
                            ? 'bg-classik-dark text-white shadow-md'
                            : 'bg-white/40 text-classik-black/50 border border-white/60 hover:bg-white/60 active:scale-95'
                          }
                        `}
                      >
                        {filter}
                        {count > 0 && (
                          <span className={`ml-1.5 ${isActive ? 'text-white/60' : 'text-classik-black/30'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ROW 3: SORT FILTER */}
              <div className="overflow-x-auto no-scrollbar">
                <div className="max-w-md mx-auto px-6 py-3 flex gap-2">
                  {[
                    { value: 'latest', label: 'Latest' },
                    { value: 'highest', label: 'Highest Score' },
                    { value: 'lowest', label: 'Lowest Score' },
                  ].map(option => {
                    const isActive = sortOrder === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSortOrder(option.value as any)}
                        className={`
                          flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]
                          transition-all duration-300
                          ${isActive
                            ? 'bg-classik-black text-white shadow-md'
                            : 'bg-white/40 text-classik-black/50 border border-white/60 hover:bg-white/60 active:scale-95'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-6 pt-10 flex flex-col gap-6">

        {isLoading || isTransitioning ? (
          /* Transition Placeholder */
          <div className={`flex flex-col items-center justify-center py-32 gap-6 ${isTransitioning ? 'animate-empty-fade-out' : 'animate-pulse'}`}>
            <div className="w-12 h-12 rounded-full border border-classik-dark/10 border-t-classik-dark animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/20">Syncing Journal</span>
          </div>
        ) : historyItems.length > 0 ? (
          /* USER HAS HISTORY */
          filteredHistory.length > 0 ? (
            /* SHOW FILTERED RESULTS */
            <div className="flex flex-col gap-6">
              {filteredHistory.map((item, index) => {
                const itemDelay = shouldAnimate ? index * 120 : 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`group w-full relative overflow-hidden bg-white/40 backdrop-blur-md border border-white/60 rounded-[32px] p-5 flex items-stretch gap-6 transition-all duration-500 cursor-pointer hover:bg-white/60 active:scale-[0.98] shadow-sm 
                      ${shouldAnimate ? 'opacity-0 animate-card-fade' : 'opacity-100'}
                    `}
                    style={{ animationDelay: shouldAnimate ? `${itemDelay + 100}ms` : '0ms' }}
                  >
                    {/* Outfit Image */}
                    <div
                      className={`relative w-24 h-32 flex-shrink-0 rounded-2xl overflow-hidden border border-classik-black/5 bg-classik-beige/30 
                        ${shouldAnimate ? 'opacity-0 animate-image-reveal' : 'opacity-100'}`}
                      style={{ animationDelay: shouldAnimate ? `${itemDelay}ms` : '0ms' }}
                    >
                      <img
                        src={item.imageUrl || '/placeholder.png'}
                        alt="Outfit Log"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 image-loading"
                        onLoad={(e) => {
                          e.currentTarget.classList.remove('image-loading');
                          e.currentTarget.classList.add('image-loaded');
                        }}
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-1">
                      {/* Metadata */}
                      <div className="flex justify-between items-start overflow-hidden">
                        <span
                          className={`text-[9px] font-black text-classik-black/30 uppercase tracking-[0.25em] 
                             ${shouldAnimate ? 'opacity-0 animate-meta-fade' : 'opacity-100'}`}
                          style={{ animationDelay: shouldAnimate ? `${itemDelay + 220}ms` : '0ms' }}
                        >
                          {formatDate(item.timestamp)}
                        </span>
                      </div>

                      <div
                        className={`flex items-baseline gap-2 
                          ${shouldAnimate ? 'opacity-0 animate-meta-fade' : 'opacity-100'}`}
                        style={{ animationDelay: shouldAnimate ? `${itemDelay + 280}ms` : '0ms' }}
                      >
                        <span className={`text-4xl font-black leading-none tracking-tighter tabular-nums ${getScoreColor(item.score)}`}>
                          {item.score}
                        </span>
                        <span className="text-[10px] font-black text-classik-taupe/60 uppercase tracking-widest">
                          {getContextWord(item.score)}
                        </span>
                      </div>

                      <p
                        className={`text-sm font-medium text-classik-black/70 leading-tight line-clamp-2 italic tracking-tight 
                          ${shouldAnimate ? 'opacity-0 animate-meta-fade' : 'opacity-100'}`}
                        style={{ animationDelay: shouldAnimate ? `${itemDelay + 340}ms` : '0ms' }}
                      >
                        "{item.data?.headline || "No headline"}"
                      </p>

                      <div
                        className={`flex items-center justify-end 
                          ${shouldAnimate ? 'opacity-0 animate-meta-fade' : 'opacity-100'}`}
                        style={{ animationDelay: shouldAnimate ? `${itemDelay + 400}ms` : '0ms' }}
                      >
                        <div className="w-8 h-8 rounded-full bg-classik-dark/5 flex items-center justify-center border border-classik-dark/5 group-hover:bg-classik-dark group-hover:border-classik-dark transition-all duration-500">
                          <ChevronRightIcon className="w-3.5 h-3.5 text-classik-dark/30 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FILTERED EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-full max-w-[320px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-10 text-center shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/20 block mb-4">
                  NO MATCHING OUTFITS
                </span>
                <p className="text-[14px] text-classik-taupe font-medium leading-relaxed">
                  You haven't logged any outfits yet.
                </p>
              </div>
            </div>
          )
        ) : (
          /* GLOBAL EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-full max-w-[340px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[48px] p-12 text-center shadow-[0_15px_45px_rgba(80,49,29,0.05)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-classik-dark/10 to-transparent opacity-50" />
              <div className="w-20 h-20 rounded-full bg-classik-beige/50 border border-classik-black/5 mx-auto mb-10 flex items-center justify-center relative">
                <HistoryIcon className="w-8 h-8 text-classik-dark/20" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-classik-black/20 block mb-6">STYLE JOURNAL</span>

              <h2 className="text-2xl font-black text-classik-black/80 tracking-tight leading-snug mb-4">
  Your style journey starts with your first outfit.
</h2>

              <p className="text-[14px] text-classik-taupe font-medium leading-relaxed max-w-[220px] mx-auto mb-10">
  Analyze your outfits and your style timeline will appear here.
</p>

              <div className="pt-8 border-t border-classik-dark/5">
                <p className="text-[14px] font-medium text-classik-taupe leading-relaxed tracking-tight px-2 text-center">
                  "Confidence is built through consistency."
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        /* Empty state ritual fade out with 10% linger */
        @keyframes ritual-fade-out {
          0% { opacity: 1; }
          70% { opacity: 0.1; }
          100% { opacity: 0; }
        }
        .animate-empty-fade-out {
          animation: ritual-fade-out 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* Step 1: Image Reveal */
        @keyframes step-image-reveal {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-image-reveal {
          animation: step-image-reveal 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* Step 2: Card Fade */
        @keyframes step-card-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-card-fade {
          animation: step-card-fade 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* Step 3: Metadata Fade */
        @keyframes step-meta-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-meta-fade {
          animation: step-meta-fade 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .image-loading { opacity: 0; }
        .image-loaded { opacity: 1; transition: opacity 500ms ease; }
      `}} />
    </div>
  );
};