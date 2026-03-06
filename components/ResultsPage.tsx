import React, { useState, useEffect, useRef } from 'react';
import { Sliders, AlertCircle } from 'lucide-react';
import { AnalysisResult, FeedbackStyle } from '../types';
import {
  ArrowLeftIcon, RefreshIcon
} from './Icons';
import { ShareCard } from './ShareCard';


interface ResultsPageProps {
  result: AnalysisResult | null;
  imageUrl: string | null;
  onRetake: () => void;
  onBack: () => void;
  onGeneratePlan: () => void;
  selectedStyle: FeedbackStyle;
  isGeneratingPlan?: boolean;
  improvementError?: boolean | null;
}

const PERSONALITY_COLORS = {
  [FeedbackStyle.MOTIVATING]: '#8C5A2B',
  [FeedbackStyle.PLAYFUL]: '#9FB3A1',
  [FeedbackStyle.SARCASTIC]: '#3F3F46',
  [FeedbackStyle.PROFESSIONAL]: '#5F6F82',
};

export const ResultsPage: React.FC<ResultsPageProps> = ({
  result,
  imageUrl,
  onRetake,
  onBack,
  onGeneratePlan,
  selectedStyle,
  isGeneratingPlan = false,
  improvementError = null
}) => {
  const [displayedScore, setDisplayedScore] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!result) return;
    window.scrollTo(0, 0);
    const targetScore = Math.round(result?.score ?? 0);
    const startTime = performance.now();
    const duration = 1200;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.floor(easeOutCubic * targetScore));
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate);
      else setDisplayedScore(targetScore);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [result?.score]);

  const normalizeSubScore = (value?: number): number => {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    let v = value;
    if (v > 10) v = v / 10;
    return Math.max(0, Math.min(10, Math.round(v)));
  };

  const enforceConsistency = (subScores: number[], mainScore: number) => {
    const avg = subScores.reduce((a, b) => a + b, 0) / subScores.length;
    const main10 = mainScore / 10;
    if (avg > main10 + 1.5) {
      return subScores.map(v => Math.max(0, Math.round(v - 2)));
    }
    return subScores;
  };

  const getMetrics = () => {
    if (!result) return [];
    const rawMetrics = [
      normalizeSubScore(result?.breakdown?.harmony),
      normalizeSubScore(result?.breakdown?.fitBalance),
      normalizeSubScore(result?.breakdown?.styleAlignment),
      normalizeSubScore(result?.breakdown?.styleIntent),
    ];
    const correctedMetrics = enforceConsistency(rawMetrics, result.score);
    return [
      { label: 'Harmony', val: correctedMetrics[0] },
      { label: 'Fit Balance', val: correctedMetrics[1] },
      { label: 'Style Alignment', val: correctedMetrics[2] },
      { label: 'Style Intent', val: correctedMetrics[3] },
    ];
  };

  const metrics = getMetrics();
  const punchlineColor = PERSONALITY_COLORS[selectedStyle] || PERSONALITY_COLORS[FeedbackStyle.MOTIVATING];

  // --- NEW LOGIC: HEADLINE FALLBACK SYSTEM ---
  const getDisplayHeadline = () => {
    const raw = result?.headline;
    // Threshold: if existing headline is shorter than 15 chars, treat it as "weak"
    if (raw && raw.length >= 15) return raw;

    switch (selectedStyle) {
      case FeedbackStyle.MOTIVATING: return "Confidence In Every Stitch.";
      case FeedbackStyle.PROFESSIONAL: return "Commanding The Room.";
      case FeedbackStyle.PLAYFUL: return "Main Character Energy.";
      case FeedbackStyle.SARCASTIC: return "Well, That Happened.";
      default: return "Awaiting Verdict";
    }
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'fitcheck-result.png', {
          type: 'image/png',
        });

        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: 'My FitCheck Result',
            text: `I just got my outfit rated by FitCheck AI.

Check yours here:
https://fitcheckai-773919598174.us-west1.run.app`,
          });
        } else {
          // fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'fitcheck-result.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  };
  // -------------------------------------------

  return (
    <div className="relative w-full min-h-screen bg-classik-beige text-classik-black font-manrope pb-32 flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-classik-warm/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-classik-taupe/10 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 w-full px-6 py-6 bg-classik-beige/90 backdrop-blur-xl border-b border-classik-dark/5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/25 text-classik-black/70 hover:bg-white/60 transition-all active:scale-95 shadow-sm">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-black/30">Your Style Result</p>
        </div>
      </header>

      {!result ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center z-10">
          <div className="w-full max-w-[320px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-10 shadow-[0_15px_45px_rgba(80,49,29,0.05)]">
            <p className="text-classik-dark/70 text-base font-medium leading-relaxed italic mb-6">
              “Style clarity comes from reflection, not assumption.”
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-taupe/40">
              Your results will appear here after an outfit is analyzed.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-6 flex flex-col items-center max-w-md mx-auto relative z-10 pt-10">
          <div className="relative mb-12 animate-fade-in">
            <div className="relative w-48 h-48 flex flex-col items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.05" />
                <circle cx="50" cy="50" r="46" fill="none" stroke="#806248" strokeWidth="1.5" strokeDasharray="289" strokeDashoffset={289 - (289 * displayedScore / 100)} className="transition-all duration-300" />
              </svg>
              <div className="text-center z-10">
                <span className="text-[10px] font-black text-classik-black/30 uppercase tracking-[0.4em] mb-1 block">Style Score</span>
                <span className="text-7xl font-black tabular-nums leading-none">{displayedScore}</span>
              </div>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
            {metrics.map((metric, idx) => (
              <div key={idx} className="bg-white/30 backdrop-blur-md border border-white/60 rounded-[24px] py-4 px-4 flex flex-col items-center shadow-sm">
                <div className="text-xl font-black tabular-nums leading-none mb-1">
                  {Math.round(metric.val)}
                  <span className="text-[10px] opacity-20 font-bold ml-0.5">/10</span>
                </div>
                <span className="text-[8px] text-classik-black/40 font-black uppercase tracking-[0.15em] text-center">{metric.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full text-center mb-10 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-classik-taupe mb-3 block">Editor&apos;s Note</span>

            {/* UPDATED H2 USING HELPER FUNCTION */}
            <h2 className="text-2xl font-black leading-tight tracking-tight px-4 whitespace-pre-line"
              style={{ color: punchlineColor }}>
              {getDisplayHeadline()}
            </h2>
          </div>

          <div className="w-full mb-12 animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="bg-white/40 border border-white/60 rounded-[32px] p-8 shadow-sm">
              <div className="text-[14px] font-medium leading-relaxed text-classik-black/80 space-y-4 italic text-center">
                {(result?.feedback ?? "Our stylist is reflecting on your look...").split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '800ms' }}>
            <button
              onClick={onRetake}
              className="h-14 rounded-full bg-white/60 border border-white text-classik-black font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <RefreshIcon className="w-3.5 h-3.5 opacity-40" />
              Analyze New Look
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onGeneratePlan();
              }}
              disabled={isGeneratingPlan}
              className={`h-14 rounded-full font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all
                ${improvementError ? 'bg-red-500 text-white' : 'bg-classik-dark text-white'}
                ${isGeneratingPlan ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isGeneratingPlan ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : improvementError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Retry Tips
                </>
              ) : (
                <>
                  <Sliders className="w-3.5 h-3.5 opacity-60" />
                  Improve Tips
                </>
              )}
            </button>
          </div>

          {/* Share Button */}
          {imageUrl && (
            <div
              className="w-full mt-4 animate-fade-in flex justify-center"
              style={{ animationDelay: '1000ms' }}
            >
              <button
                onClick={handleShare}
                className="w-[calc(50%-0.375rem)] h-14 rounded-full bg-white/60 border border-white text-classik-black font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                {/* Share icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5 opacity-40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 17L17 7M17 7H7M17 7V17"
                  />
                </svg>
                Share Result
              </button>
            </div>
          )}
        </div>
      )}

      {/* HIDDEN SHARE CARD (for image generation only) */}
      {result && imageUrl && (
        <div
          ref={shareCardRef}
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            pointerEvents: 'none',
          }}
        >
          <ShareCard
            imageUrl={imageUrl}
            score={result.score}
            headline={getDisplayHeadline()}
            explanation={result.feedback} // ← THIS
            style={selectedStyle}
          />
        </div>
      )}
    </div>
  );
};

