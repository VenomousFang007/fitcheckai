
import React, { useState, useEffect } from 'react';
import { ShieldIcon, RefreshIcon } from './Icons';

export type ErrorType = 'UNAVAILABLE' | 'COOLDOWN' | 'OFFLINE' | 'GENERIC';

interface ErrorStateModalProps {
  type: ErrorType;
  cooldownSeconds?: number;
  onRetry: () => void;
  onUploadNew: () => void;
  onClose: () => void;
}

export const ErrorStateModal: React.FC<ErrorStateModalProps> = ({ 
  type, 
  cooldownSeconds = 0, 
  onRetry, 
  onUploadNew, 
  onClose 
}) => {
  const [timeLeft, setTimeLeft] = useState(cooldownSeconds);

  useEffect(() => {
    if (type === 'COOLDOWN' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [type, timeLeft]);

  // Helper to determine content based on error type
  const getErrorContent = () => {
    switch (type) {
      case 'COOLDOWN':
        return {
          title: "Service is Busy",
          body: `Our styling engine needs a moment. Please wait ${timeLeft}s before trying again.`,
          primaryLabel: `Wait ${timeLeft}s`,
          primaryAction: () => {},
          disabled: true
        };
      case 'OFFLINE':
        return {
          title: "You're Offline",
          body: "Check your internet connection to continue with the analysis.",
          primaryLabel: "Retry Connection",
          primaryAction: onRetry,
          disabled: false
        };
      case 'UNAVAILABLE':
        return {
          title: "Model Unavailable",
          body: "The AI service is currently overwhelmed. We're working on restoring access.",
          primaryLabel: "Retry Now",
          primaryAction: onRetry,
          disabled: false
        };
      default:
        return {
          title: "Analysis Failed",
          body: "An unexpected error occurred. This might be due to a complex image or technical glitch.",
          primaryLabel: "Retry",
          primaryAction: onRetry,
          disabled: false
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-[#0D0D0D] border-t border-white/10 rounded-t-[32px] p-8 pb-14 shadow-[0_-10px_60px_rgba(0,0,0,0.8)] transform animate-slide-up-sheet relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 flex items-center justify-center mb-6">
            <ShieldIcon className="w-7 h-7 text-[#FF5C5C]" />
          </div>
          
          <h3 className="text-white font-black text-xl tracking-tight mb-4">{content.title}</h3>
          <p className="text-white/60 text-base leading-relaxed font-medium mb-10 max-w-[300px]">{content.body}</p>

          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={content.primaryAction}
              disabled={content.disabled}
              className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-[0.15em] transition-all
                ${content.disabled 
                  ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed' 
                  : 'bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95'
                }
              `}
            >
              {type !== 'COOLDOWN' && <RefreshIcon className="w-4 h-4" />}
              {content.primaryLabel}
            </button>
            <button 
              onClick={onUploadNew}
              className="w-full h-14 rounded-2xl bg-white/5 text-white/50 font-black text-xs uppercase tracking-[0.2em] border border-white/5 active:scale-95 transition-colors"
            >
              Upload New Photo
            </button>
            <button 
              onClick={onClose}
              className="mt-2 text-white/30 text-[10px] uppercase font-bold tracking-[0.3em] hover:text-white/50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
