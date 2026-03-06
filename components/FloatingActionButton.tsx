import React from 'react';
import { FitCheckLogo } from './Icons';

interface FloatingActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isAnalyzing?: boolean;
  onDisabledClick?: () => void;
  validationMessage?: string | null;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ 
  onClick, 
  disabled, 
  isAnalyzing, 
  onDisabledClick,
  validationMessage 
}) => {
  const showSpinner = isAnalyzing;

  const handleClick = () => {
    if (disabled) {
      if (onDisabledClick) onDisabledClick();
      return;
    }
    onClick();
  };

  const getButtonStyles = () => {
    if (showSpinner) {
      return "bg-classik-dark animate-pulse text-white cursor-wait opacity-90";
    }
    
    if (disabled) {
      return "bg-white/40 border border-white/60 text-classik-black/20 cursor-default shadow-none transform-none backdrop-blur-md";
    }
    
    return "bg-classik-dark text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]";
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 pt-4 pb-12">
      <button
        onClick={handleClick}
        aria-disabled={disabled}
        className={`
          relative w-full h-14 rounded-full flex items-center justify-center gap-3
          font-extrabold text-sm uppercase tracking-[0.15em]
          transition-all duration-500 ease-out
          ${getButtonStyles()}
        `}
      >
        <span className="relative z-10">
          {showSpinner ? 'Refining Analysis...' : 'Get Result'}
        </span>
        
        {showSpinner && (
           <FitCheckLogo className="w-5 h-5 relative z-10 text-white opacity-80 animate-spin-ring" />
        )}
        
        {!disabled && !showSpinner && (
          <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
        )}
      </button>

      {/* Validation Message */}
      <div 
        className={`
          h-4 flex items-center justify-center
          text-classik-black/40 text-[10px] font-bold uppercase tracking-widest
          transition-all duration-300 transform
          ${validationMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}
        `}
      >
        {validationMessage}
      </div>
    </div>
  );
};