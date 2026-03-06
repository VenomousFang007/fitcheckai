import { FitCheckLogo } from './FitCheckLogo';
import type { WeatherContext } from '../types';

// ============================================================================
// Homepage.tsx - Updated import and usage (MINIMAL CHANGES)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  HistoryIcon,
  CameraIcon,
  UserIcon,
  StyleStreak,
  SunIcon
} from './Icons';
import { FeedbackStyle, HistoryEntry } from '../types';
// ✅ CHANGED: Correct import for WeatherFeed

import WeeklyChallengeCard from './WeeklyChallengeCard';


declare global {
  interface Window {
    _fitCheckHomeLoaded?: boolean;
  }
}

interface ExtendedHistoryEntry extends HistoryEntry {
  occasion?: string;
}

interface HomepageProps {
  onStart: () => void;
  onHistory: () => void;
  onProfile: () => void;
  selectedStyle?: FeedbackStyle;
  streakJustUpdated?: boolean;
  weatherContext: WeatherContext | null;
  weeklyChallenge: any | null; // 🔥 ADD THIS
}

export const Homepage: React.FC<HomepageProps> = ({
  onStart,
  onHistory,
  onProfile,
  selectedStyle = FeedbackStyle.MOTIVATING,
  streakJustUpdated,
  weatherContext,
  weeklyChallenge // 🔥 ADD THIS
}) => {
  const [hasAnimated, setHasAnimated] = useState(!!window._fitCheckHomeLoaded);
  const [isLoading, setIsLoading] = useState(!hasAnimated);
  const [lastEntry, setLastEntry] = useState<ExtendedHistoryEntry | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [computedStreak, setComputedStreak] = useState(0);



  useEffect(() => {
    const loadHomepageData = async () => {
      try {
        if (!hasAnimated) setIsLoading(true);

        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data: streakData, error: streakError } = await supabase
          .from('OutfitData')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!streakError && streakData && Array.isArray(streakData)) {
          const dates = streakData.map((row) => {
            const d = new Date(row.created_at as string);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          });

          const uniqueDays = Array.from(new Set(dates)).sort((a, b) => b - a);
          let streak = 0;

          if (uniqueDays.length > 0) {
            let cursor = new Date(uniqueDays[0]);
            for (const day of uniqueDays) {
              if (day === cursor.getTime()) {
                streak++;
                cursor.setDate(cursor.getDate() - 1);
              } else {
                break;
              }
            }
          }
          setComputedStreak(streak);
        }

        const { data, error } = await supabase
          .from('OutfitData')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) {
          setLastEntry(null);
          setHistoryCount(0);
        } else {
          const latest = data[0];
          let parsedInsight = latest.insight;

          if (typeof parsedInsight === 'string') {
            try {
              parsedInsight = JSON.parse(parsedInsight);
            } catch {
              parsedInsight = {};
            }
          }

          setLastEntry({
            id: latest.id,
            timestamp: latest.created_at,
            imageUrl: latest.image_url,
            score: latest.score,
            alignment: latest.score >= 80 ? 'STRONG ALIGNMENT' : 'MODERATE ALIGNMENT',
            comparison: '0',
            occasion: latest.title,
            data: parsedInsight
          });

          const { count } = await supabase
            .from('OutfitData')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          setHistoryCount(count || 0);
        }

        window._fitCheckHomeLoaded = true;
        setHasAnimated(true);

      } catch (err) {
        console.error('Homepage load failed', err);
      } finally {
        setIsLoading(false);
        setIsDataLoaded(true)
      }
    };

    loadHomepageData();
  }, []);

  const handleStart = () => {
    onStart();
  };

  const getLastCheckDateText = () => {
    if (!lastEntry) return "";
    const date = new Date(lastEntry.timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };




  const palette = lastEntry?.data?.palette || [];

  if (isLoading && !hasAnimated) {
    return <div className="min-h-screen w-full bg-classik-beige" />;
  }

  if (!isDataLoaded) {
    return <div className="min-h-screen w-full bg-classik-beige" />;
  }

  return (
    <div className={`min-h-screen w-full bg-classik-beige text-classik-black flex flex-col relative overflow-hidden font-manrope ${hasAnimated ? '' : 'animate-fade-in'}`}>

      {/* Weather data fetcher - returns null, only fetches data */}



      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-15%] w-[70%] h-[70%] bg-classik-warm/10 blur-[120px] rounded-full pointer-events-none animate-ambient-calm" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[70%] h-[70%] bg-classik-taupe/15 blur-[120px] rounded-full pointer-events-none animate-ambient-calm" style={{ animationDelay: '5s' }} />

      <header className="w-full px-6 py-4 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-3">
          <FitCheckLogo className="w-8 h-auto text-[#5A4636]" />

          <h1 className="text-[13px] font-black tracking-[0.25em] uppercase text-classik-black leading-none">
            FitCheck<span className="text-classik-dark">AI</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <StyleStreak
            streak={computedStreak}
            selectedStyle={selectedStyle}
            justUpdated={streakJustUpdated}
          />
          <button onClick={onHistory} className="w-11 h-11 rounded-full bg-white/20 border border-classik-dark/10 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-sm">
            <HistoryIcon className="w-[18px] h-[18px] text-classik-black/60" />
          </button>
          <button onClick={onProfile} className="w-11 h-11 rounded-full bg-white/20 border border-classik-dark/10 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-sm">
            <UserIcon className="w-[18px] h-[18px] text-classik-black/60" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-4 pb-12 z-10 max-w-md mx-auto w-full">
        {historyCount === 0 || !lastEntry ? (
          <section className="flex-1 flex flex-col justify-center">
            <div className={`bg-white/40 backdrop-blur-xl border border-white/60 rounded-[48px] p-10 pb-12 shadow-[0_20px_60px_rgba(80,49,29,0.05)] flex flex-col items-center text-center ${hasAnimated ? '' : 'animate-fade-in'}`}>
              <div className="w-20 h-20 rounded-full bg-classik-beige/50 border border-classik-black/5 flex items-center justify-center mb-10 relative">
                <div className="absolute inset-0 rounded-full border border-classik-dark/5 animate-ping opacity-20" />
                <CameraIcon className="w-8 h-8 text-classik-dark/30" />
              </div>
              <div className="mb-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/30 mb-2">Status Overview</h2>
                <h3 className="text-2xl font-black text-classik-black tracking-tight leading-tight uppercase">No fits analyzed yet</h3>
              </div>
              <p className="text-[14px] text-classik-taupe font-medium leading-relaxed mb-12 max-w-[240px]">
                Upload your first outfit to get your style score, color breakdown, and weather fit.
              </p>
              <button onClick={handleStart} className="group relative w-full h-16 rounded-full flex items-center justify-center gap-3 bg-classik-dark transition-all duration-500 active:scale-[0.98] shadow-lg overflow-hidden">
                <CameraIcon className="w-4 h-4 text-white/50 group-hover:scale-110 transition-transform" />
                <span className="text-white font-black text-[12px] tracking-[0.3em] uppercase relative z-10">Analyze Outfit</span>
              </button>
            </div>
          </section>
        ) : (
          <div className={`flex flex-col h-full ${hasAnimated ? '' : 'animate-fade-in'}`}>
            <div className="mb-4 mt-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-classik-black/30 mb-1">Current Style State</h2>
              <h3 className="text-base font-black text-classik-black/70 tracking-[0.2em] leading-none uppercase">
                Latest Fit
              </h3>
            </div>

            <section className="mb-4">
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-6 shadow-sm flex flex-col gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-28 rounded-2xl overflow-hidden border border-classik-black/5 bg-classik-beige/50 shrink-0 flex items-center justify-center">
                    {imageError || !lastEntry.imageUrl ? (
                      <div className="flex flex-col items-center justify-center text-classik-taupe/40 p-2 text-center">
                        <CameraIcon className="w-6 h-6 mb-1 opacity-20" />
                        <span className="text-[7px] font-black uppercase tracking-widest">No Image</span>
                      </div>
                    ) : (
                      <img src={lastEntry.imageUrl} alt="Recent outfit" className="w-full h-full object-cover grayscale-[0.2]" onError={() => setImageError(true)} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-classik-black/30 uppercase tracking-[0.2em] mb-1">Last Check: {getLastCheckDateText()}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl font-black text-classik-warm tracking-tighter tabular-nums leading-none">{lastEntry.score}</span>
                      <span className="text-[10px] font-black text-classik-taupe/50 uppercase tracking-widest">Score</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 border-t border-classik-black/5 pt-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-classik-black/40">
                    <span>Feedback Mode</span>
                    <span className="text-classik-black/80">{selectedStyle}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-classik-black/40">
                    <span>Outfits Analyzed</span>
                    <span className="text-classik-black/80">{historyCount}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-10 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center justify-center gap-2.5 p-4 bg-white/20 backdrop-blur-md border border-white/40 rounded-3xl shadow-sm min-h-[90px]">
                  <span className="text-[9px] font-black text-classik-black/30 uppercase tracking-[0.15em] text-center leading-none">Style Palette</span>
                  <div className="flex items-center gap-1.5">
                    {palette.length > 0 ? (
                      palette.slice(0, 5).map((color: any, i: number) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-white/40 shadow-sm" style={{ backgroundColor: typeof color === 'string' ? color : (color?.hex || 'transparent') }} />
                      ))
                    ) : (
                      [1, 2, 3, 4, 5].map((_, i) => <div key={i} className="w-5 h-5 rounded-full border border-white/10 bg-classik-black/5" />)
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 p-4 bg-white/20 backdrop-blur-md border border-white/40 rounded-3xl shadow-sm min-h-[90px]">
                  <span className="text-[9px] font-black text-classik-black/30 uppercase tracking-[0.15em] text-center leading-none">Occasion</span>
                  <span className="text-xs font-bold text-classik-black/80 uppercase tracking-tight text-center leading-tight">{`For: ${lastEntry.occasion || "Daily"}`}</span>
                </div>
              </div>
              {weeklyChallenge && (
                <div className="mt-3">
                  <WeeklyChallengeCard challenge={weeklyChallenge} />
                </div>
              )}

            </section>

            <section className="mt-auto">
              <button onClick={handleStart} className="group relative w-full h-20 rounded-[40px] flex items-center justify-center gap-3 bg-classik-dark transition-all duration-500 active:scale-[0.98] shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CameraIcon className="w-5 h-5 text-white/40" />
                <span className="text-white font-black text-[13px] tracking-[0.4em] uppercase relative z-10">Analyze Outfit</span>
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};