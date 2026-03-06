import React from 'react';
import { ShieldIcon, TShirtIcon, UserIcon, SunIcon, CameraIcon } from './Icons';

export type ValidationFailureType = 
  | 'MULTIPLE_PEOPLE' 
  | 'TOO_DARK' 
  | 'OUTFIT_NOT_VISIBLE' 
  | 'NON_FASHION' 
  | 'INAPPROPRIATE_CONTENT' 
  | 'PORTRAIT_ONLY' 
  | 'ANIMAL_DETECTION' 
  | 'NON_HUMAN' 
  | 'SIMILAR_PALETTE'
  | 'GENERIC';

interface ValidationOverlayProps {
  type: ValidationFailureType;
  onClose: () => void;
  onRetry?: () => void;
  onContinue?: () => void;
}

const VALIDATION_MESSAGES: Record<ValidationFailureType, { title: string; body: string; icon: React.FC<{className?: string}> }> = {
  'MULTIPLE_PEOPLE': {
    title: "Too many people",
    body: "We can only analyze one outfit at a time. Please upload a photo with just one person.",
    icon: UserIcon
  },
  'TOO_DARK': {
    title: "Lighting issue",
    body: "This photo is too dark to analyze clearly. Try taking the photo in better lighting.",
    icon: SunIcon
  },
  'PORTRAIT_ONLY': {
    title: "Incomplete view",
    body: "We need to see the full outfit. Try stepping back so your clothing is fully visible.",
    icon: UserIcon
  },
  'NON_FASHION': {
    title: "Invalid image",
    body: "This image can’t be analyzed. Please upload a clear photo of a real outfit.",
    icon: ShieldIcon
  },
  'INAPPROPRIATE_CONTENT': {
    title: "Invalid image",
    body: "This image can’t be analyzed. Please upload a clear photo of a real outfit.",
    icon: ShieldIcon
  },
  'NON_HUMAN': {
    title: "Invalid image",
    body: "This image can’t be analyzed. Please upload a clear photo of a real outfit.",
    icon: ShieldIcon
  },
  'ANIMAL_DETECTION': {
    title: "Invalid image",
    body: "This image can’t be analyzed. Please upload a clear photo of a real outfit.",
    icon: ShieldIcon
  },
  'OUTFIT_NOT_VISIBLE': {
    title: "Invalid image",
    body: "This image can’t be analyzed. Please upload a clear photo of a real outfit.",
    icon: TShirtIcon
  },
  'SIMILAR_PALETTE': {
  title: "Similar color palette",
  body: "This outfit uses a similar color palette to one you’ve analyzed before. You can still continue if the styling or occasion is different.",
  icon: CameraIcon
},
  'GENERIC': {
    title: "Upload error",
    body: "Please upload a clear photo of a real outfit.",
    icon: CameraIcon
  }
};

export const ValidationOverlay: React.FC<ValidationOverlayProps> = ({
  type,
  onClose,
  onRetry,
  onContinue,
}) => {
  const content = VALIDATION_MESSAGES[type] || VALIDATION_MESSAGES.GENERIC;
  const Icon = content.icon;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-end justify-center bg-classik-black/40 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white/95 border-t border-classik-dark/5 rounded-t-[40px] p-8 pb-14 shadow-[0_-20px_60px_rgba(0,0,0,0.1)] transform animate-slide-up-sheet relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-classik-beige/30 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-classik-dark/5 border border-classik-dark/10 flex items-center justify-center mb-6">
            <Icon className="w-7 h-7 text-classik-dark/40" />
          </div>
          
          <h3 className="text-classik-black font-black text-xl tracking-tight mb-4">
            {content.title}
          </h3>
          
          <p className="text-classik-taupe text-base leading-relaxed font-medium mb-10 max-w-[300px]">
            {content.body}
          </p>

         <div className="w-full flex flex-col gap-3">
  {type === 'SIMILAR_PALETTE' ? (
    <>
      <button
        onClick={onContinue}
        className="group relative w-full h-16 rounded-full flex items-center justify-center bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98]"
      >
        Continue Anyway
      </button>

      <button
        onClick={onRetry}
        className="w-full h-16 rounded-full bg-classik-black/5 text-classik-taupe font-black text-[11px] uppercase tracking-[0.2em] active:scale-95"
      >
        Upload Different Photo
      </button>
    </>
  ) : (
    <>
      <button 
        onClick={onRetry}
        className="group relative w-full h-16 rounded-full flex items-center justify-center bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-[0.98]"
      >
        Upload New Photo
      </button>

      <button 
        onClick={onClose}
        className="w-full h-16 rounded-full bg-classik-black/5 text-classik-taupe font-black text-[11px] uppercase tracking-[0.2em] active:scale-95"
      >
        Dismiss
      </button>
    </>
  )}
</div>
        </div>
      </div>
    </div>
  );
};