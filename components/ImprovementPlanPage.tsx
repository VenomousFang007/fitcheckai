
import React, { useState, useEffect } from 'react';
import { ImprovementPlan, WeatherStyleNote } from '../types';
import {
  ArrowLeftIcon, ChevronRightIcon, RefreshIcon,
  StarIcon
} from './Icons';
import { generateWeatherStyleNote } from '../utils/weatherHelper';
import { FitCheckLogo } from './FitCheckLogo';
import type { WeatherContext } from '../types';


interface ImprovementPlanPageProps {
  plan: ImprovementPlan | null;
  imagePreviewUrl: string | null;
  onBack: () => void;
  onRetake: () => void;
  weatherContext: WeatherContext | null; // ✅ CHANGED: from currentWeather string
  outfitScore: number;
  onOpenStyleAI: () => void;
}
export const ImprovementPlanPage: React.FC<ImprovementPlanPageProps> = ({
  plan,
  imagePreviewUrl,
  onBack,
  onRetake,
  weatherContext, // ✅ CHANGED: from currentWeather
  outfitScore,
  onOpenStyleAI,
}) => {
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);
  const [weatherNote, setWeatherNote] = useState<WeatherStyleNote | null>(null);

  const [showEcho, setShowEcho] = useState(true);

  useEffect(() => {
    // Remove echo elements after animation completes
    const timer = setTimeout(() => setShowEcho(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const FAB_SIZE = 56;
  const RAIL_PADDING = 16;

  const [fabPosition, setFabPosition] = useState({
    x: window.innerWidth - FAB_SIZE - RAIL_PADDING,
    y: Math.min(
      window.innerHeight - 200,
      window.innerHeight * 0.6
    ),
  });

  const dragRef = React.useRef<HTMLButtonElement | null>(null);
  const isDraggingRef = React.useRef(false);
  const dragOffsetRef = React.useRef({ x: 0, y: 0 });

  const hasMovedRef = React.useRef(false);




  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    console.log('🔍 Weather useEffect triggered:', {
      hasProfile: !!plan?.outfitWeatherProfile,
      hasWeatherContext: !!weatherContext,
      outfitScore,
      profile: plan?.outfitWeatherProfile
    });

    if (plan?.outfitWeatherProfile && weatherContext && outfitScore !== undefined) {
      const note = generateWeatherStyleNote(
        plan.outfitWeatherProfile,
        weatherContext, // ✅ CHANGED: now passing full WeatherContext
        outfitScore
      );
      console.log('✅ Generated weather note:', note);
      setWeatherNote(note);
    } else {
      console.log('❌ Missing data for weather note generation');
      setWeatherNote(null);
    }
  }, [plan?.outfitWeatherProfile, weatherContext, outfitScore]); // ✅ CHANGED: dependency

  if (!plan) {
    return (
      <div className="relative w-full min-h-screen bg-classik-beige text-classik-black font-manrope pb-20 flex flex-col">



        {/* HEADER stays */}
        <header className="sticky top-0 z-50 bg-classik-beige/90 backdrop-blur-xl border-b border-classik-dark/5">
          <div className="max-w-md mx-auto px-6 py-6 flex items-center justify-between">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/60 text-classik-black/70 shadow-sm"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>

            <div className="text-right">
              <h1 className="text-[11px] font-black uppercase tracking-[0.25em] text-classik-black/80">
                Refining Your Look
              </h1>
            </div>
          </div>
        </header>

        {/* EMPTY STATE */}
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <div className="w-full max-w-[320px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-10 shadow-[0_15px_45px_rgba(80,49,29,0.05)]">
            <p className="text-classik-dark/70 text-base font-medium leading-relaxed italic mb-6">
              “Improvement isn’t about doing more. It’s about seeing more clearly.”
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-taupe/40">
              Analyze an outfit and we’ll focus on what can be improved.
            </p>
          </div>
        </div>

      </div>
    );
  }
  return (
    <div className="relative w-full min-h-screen bg-classik-beige text-classik-black font-manrope pb-20 overflow-x-hidden selection:bg-classik-dark/10">

      {/* 1. HEADER */}
      <header className="sticky top-0 z-50 bg-classik-beige/90 backdrop-blur-xl border-b border-classik-dark/5">
        <div className="max-w-md mx-auto px-6 py-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/60 text-classik-black/70 hover:bg-white/60 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div className="text-right">
            <h1 className="text-[11px] font-black uppercase tracking-[0.25em] text-classik-black/80">Refining Your Look</h1>
            <p className="text-[9px] text-classik-taupe font-bold uppercase tracking-widest mt-1">Small changes. Big difference</p>
          </div>
        </div>
      </header>

      <div className="px-6 pt-10 flex flex-col items-center max-w-md mx-auto relative z-10">

        {/* 2. CONTEXT REFERENCE */}
        <div className="w-full flex items-center gap-5 mb-10 animate-fade-in">
          {imagePreviewUrl && (
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border border-classik-dark/10 bg-white/40 shadow-sm">
              <img src={imagePreviewUrl} alt="Context" className="w-full h-full object-cover opacity-80" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-classik-black/20">Your outfit</span>
            <p className="text-classik-taupe text-[11px] font-bold leading-tight tracking-wide">
              Let’s break it down.
            </p>
          </div>
        </div>

        {/* 3. FIT DIAGNOSIS SUMMARY */}
        <section className="w-full mb-10 animate-fade-in">
          <div className="bg-white/50 border border-white/80 rounded-[32px] p-8 shadow-sm">
            <div className="space-y-4">
              <span className="text-[10px] font-black text-classik-dark/40 uppercase tracking-[0.3em] block">Key Focus</span>
              <p className="text-classik-black font-semibold text-lg leading-snug tracking-tight">
                {plan.diagnosticSummary.primaryIssue}
              </p>
              {plan.diagnosticSummary.secondaryIssue && (
                <p className="text-classik-black/60 text-sm font-medium italic">
                  {plan.diagnosticSummary.secondaryIssue}
                </p>
              )}
              <div className="pt-6 border-t border-classik-dark/5">
                <span className="text-[10px] font-black text-classik-taupe/60 uppercase tracking-[0.2em] mb-1 block">The outcome</span>
                <p className="text-classik-dark font-black text-sm tracking-tight uppercase">{plan.diagnosticSummary.alignmentImpact}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SPECIFIC ADJUSTMENTS */}
        {Array.isArray(plan.problemStatements) && plan.problemStatements.length > 0 && (
          <section className="w-full mb-10 animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <div className="bg-white/40 border border-white/60 rounded-[32px] p-8 shadow-sm">
              <span className="text-[10px] font-black text-classik-dark/40 uppercase tracking-[0.3em] block mb-4">Specific Changes</span>
              <ul className="space-y-3">
                {plan.problemStatements.map((problem, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-classik-dark/20 mt-1.5 flex-shrink-0" />
                    <p className="text-[14px] text-classik-black font-bold leading-snug tracking-tight">
                      {problem}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 5. WINNING ELEMENTS */}
        {Array.isArray(plan.winningElements) && plan.winningElements.length > 0 && (
          <section className="w-full mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="bg-classik-dark/5 border border-classik-dark/5 rounded-[32px] p-8 shadow-sm">
              <span className="text-[10px] font-black text-classik-dark/40 uppercase tracking-[0.3em] block mb-4">What works best</span>
              <div className="flex flex-wrap gap-2">
                {plan.winningElements.map((el, idx) => (
                  <div key={idx} className="px-4 py-2 bg-white/60 rounded-full border border-white text-[11px] font-bold text-classik-dark">
                    {el}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. IMPROVEMENT STRATEGY CARDS */}
        <section className="w-full space-y-6 mb-12 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-4 mb-2 pl-1">
            <StarIcon className="w-4 h-4 text-classik-dark/30" />
            <h2 className="text-[11px] font-black text-classik-black/30 uppercase tracking-[0.4em]">Ways to improve the fit</h2>
          </div>

          {(Array.isArray(plan.improvementSections) ? plan.improvementSections : []).map((section, idx) => {
            if (!section) return null;
            return (
              <div
                key={idx}
                className="bg-white/50 border border-white/80 rounded-[40px] p-8 shadow-sm"
              >
                <h3 className="text-xl font-black text-classik-dark tracking-tight leading-tight mb-8">
                  {section.title}
                </h3>

                <div className="space-y-8">
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black text-classik-taupe/50 uppercase tracking-[0.3em] block">Why it matters</span>
                    <p className="text-[15px] text-classik-black/70 leading-relaxed font-medium tracking-tight">
                      {section.whyMatters}
                    </p>
                  </div>

                  <div className="bg-classik-dark/5 rounded-3xl p-6 space-y-3 border border-classik-dark/5">
                    <span className="text-[10px] font-black text-classik-dark/60 uppercase tracking-[0.3em] block">Try this</span>
                    <ul className="space-y-3">
                      {(Array.isArray(section.actionSteps) ? section.actionSteps : []).map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-classik-dark/40 mt-1.5 flex-shrink-0" />
                          <p className="text-[14px] text-classik-dark leading-snug font-bold tracking-tight">
                            {step}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* 7. EXTRA STYLE NOTES */}
        {Array.isArray(plan.advancedInsights) && plan.advancedInsights.length > 0 && (
          <section className="w-full mb-12 px-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => setIsDeepDiveOpen(!isDeepDiveOpen)}
              className="w-full flex items-center justify-between py-6 border-y border-classik-dark/10 hover:bg-white/20 transition-all group"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-classik-black/40 group-hover:text-classik-black transition-colors">
                A few extra notes
              </span>
              <ChevronRightIcon className={`w-4 h-4 text-classik-black/20 transition-transform duration-500 ${isDeepDiveOpen ? 'rotate-90' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${isDeepDiveOpen ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-6 px-2">
                {plan.advancedInsights.map((insight, idx) => (
                  <div key={idx} className="border-l-2 border-classik-dark/20 pl-6 py-1">
                    <p className="text-[15px] text-classik-black leading-relaxed font-medium tracking-tight">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* DYNAMIC WEATHER STYLE NOTE */}
        {!weatherContext ? (
          <section className="w-full mb-12 animate-fade-in">
            <div className="bg-white/30 border border-white/50 rounded-[32px] p-8 shadow-sm">
              <span className="text-[10px] font-black text-classik-dark/30 uppercase tracking-[0.3em] block mb-4">
                Can You Wear This {weatherContext?.timeWindow?.label || 'Today'}?
              </span>
              <p className="text-[14px] text-classik-black/40 leading-relaxed font-medium tracking-tight italic">
                Checking weather conditions...
              </p>
            </div>
          </section>
        ) : weatherNote ? (
          <section className="w-full mb-12 animate-fade-in">
            <div className="bg-white/30 border border-white/50 rounded-[32px] p-8 shadow-sm">
              <span className="text-[10px] font-black text-classik-dark/30 uppercase tracking-[0.3em] block mb-4">
                Can You Wear This {weatherContext.timeWindow?.label || 'Today'}?
              </span>
              <p className="text-[14px] text-classik-black/60 leading-relaxed font-medium tracking-tight">
                {weatherNote.summary}
              </p>
            </div>
          </section>
        ) : null}

        {/* CHECK WEATHER TODAY DROPDOWN */}
        {weatherContext && (
          <section className="w-full mb-12 px-6 animate-fade-in" style={{ animationDelay: '0.22s' }}>
            <button
              onClick={() => setIsWeatherExpanded(!isWeatherExpanded)}
              className="w-full flex items-center justify-between py-6 border-y border-classik-dark/10 hover:bg-white/20 transition-all group"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-classik-black/40 group-hover:text-classik-black transition-colors">
                Check Weather Today
              </span>
              <ChevronRightIcon className={`w-4 h-4 text-classik-black/20 transition-transform duration-500 ${isWeatherExpanded ? 'rotate-90' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${isWeatherExpanded ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['morning', 'afternoon', 'evening', 'night'].map((time) => {
                  const segment = weatherContext.relevantForecast?.[time as keyof typeof weatherContext.relevantForecast];

                  return (
                    <div key={time} className="flex flex-col items-center justify-center gap-1 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-sm">
                      <span className="text-[8px] font-black uppercase tracking-widest text-classik-black/30">
                        {time}
                      </span>

                      {segment ? (
                        <>
                          <span className="text-base">{segment.icon}</span>
                          <span className="text-[10px] font-bold text-classik-black/70">
                            {segment.label}
                          </span>
                        </>
                      ) : (
                        <span className="text-[9px] text-classik-black/30">
                          —
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 8. FINAL ACTION SECTION */}
        <div className="w-full mt-12 mb-20 animate-fade-in flex flex-col items-center gap-6" style={{ animationDelay: '0.25s' }}>
          <button
            onClick={onRetake}
            className="group relative w-full h-16 rounded-full flex items-center justify-center gap-4 bg-classik-dark text-white shadow-xl transition-all duration-500 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <RefreshIcon className="w-4 h-4 text-white/80" />
            <span className="font-black text-[11px] tracking-[0.25em] uppercase relative z-10">
              Check a new look
            </span>
          </button>

          <p className="text-[9px] font-bold text-classik-taupe/40 uppercase tracking-[0.4em] italic text-center">
            Style Guidance by FitCheck AI
          </p>
        </div>
      </div>
      {plan && (
        <>
          {/* Inject keyframe animation */}
          {showEcho && (
            <style>{`
        @keyframes echoRipple {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(2.8);
            opacity: 0;
          }
        }
      `}</style>
          )}

          <div
            className="fixed z-[90] pointer-events-none"
            style={{
              left: fabPosition.x,
              top: fabPosition.y,
            }}
          >
            {/* Echo Ripple Rings */}
            {showEcho && (
              <>
                <div
                  className="absolute w-14 h-14 rounded-full border-2 border-classik-dark/30"
                  style={{
                    animation: 'echoRipple 1.6s ease-out forwards',
                  }}
                />
                <div
                  className="absolute w-14 h-14 rounded-full border-2 border-classik-dark/20"
                  style={{
                    animation: 'echoRipple 1.6s ease-out forwards',
                    animationDelay: '0.4s',
                  }}
                />
              </>
            )}

            {/* Interactive Button */}
            <button
              ref={dragRef}
              className="
          relative
          w-14
          h-14
          rounded-full
          bg-classik-dark
          text-white
          flex
          items-center
          justify-center
          shadow-xl
          active:scale-95
          transition-transform
          touch-none
          pointer-events-auto
        "
              onPointerDown={(e) => {
                isDraggingRef.current = true;
                hasMovedRef.current = false;

                dragOffsetRef.current = {
                  x: e.clientX - fabPosition.x,
                  y: e.clientY - fabPosition.y,
                };

                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!isDraggingRef.current) return;

                hasMovedRef.current = true;

                const screenWidth = window.innerWidth;
                const FAB_SIZE = 56;
                const RAIL_PADDING = 16;

                const isLeftRail = e.clientX < screenWidth / 2;
                const railX = isLeftRail
                  ? RAIL_PADDING
                  : screenWidth - FAB_SIZE - RAIL_PADDING;

                const HEADER_HEIGHT = 80;
                const BOTTOM_SAFE_AREA = 120;

                const nextY = e.clientY - dragOffsetRef.current.y;
                const clampedY = Math.max(
                  HEADER_HEIGHT,
                  Math.min(window.innerHeight - FAB_SIZE - BOTTOM_SAFE_AREA, nextY)
                );

                setFabPosition({ x: railX, y: clampedY });
              }}
              onPointerUp={(e) => {
                isDraggingRef.current = false;
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                if (!hasMovedRef.current) {
                  onOpenStyleAI();
                }
              }}
            >
              <FitCheckLogo className="w-14 h-14" />
            </button>

            {/* Label */}
            <div className="
        absolute
        left-1/2
        -translate-x-1/2
        top-[60px]
        whitespace-nowrap
        pointer-events-none
      ">
              <span className="
          text-[9px]
          font-black
          uppercase
          tracking-[0.15em]
          text-classik-dark/50
        ">
                Ask Style AI
              </span>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
