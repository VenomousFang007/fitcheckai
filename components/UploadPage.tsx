
import React, { useState, useMemo } from 'react';
import { UploadZone } from './UploadZone';
import { SelectionGroup } from './SelectionGroup';
import { PersonalitySelector } from './PersonalitySelector';
import { FloatingActionButton } from './FloatingActionButton';
import { FeedbackStyle, OccasionPreset } from '../types';
import { 
  ArrowLeftIcon, 
  TShirtIcon, 
  CropIcon, 
  SunIcon, 
  UserIcon, 
  RepeatIcon 
} from './Icons';

interface UploadPageProps {
  imagePreviewUrl: string | null;
  selectedStyle: FeedbackStyle;
  selectedOccasion: OccasionPreset | null;
  customOccasion: string;
  isAnalyzing: boolean;
  isValidated: boolean;
  validationMsg: string | null;
  onBack: () => void;
  onImageSelected: (url: string, file: File) => void;
  onStyleSelect: (style: FeedbackStyle) => void;
  onOccasionSelect: (val: OccasionPreset | null) => void;
  onCustomOccasionChange: (val: string) => void;
  onAnalyze: () => void;
  validationStatus?: 'idle' | 'pending' | 'accepted' | 'rejected';
  isOffline: boolean;
}

/**
 * Editorial-friendly mapping for validation failure reasons.
 */
const getValidationUI = (reason: string | null) => {
  const r = (reason || "").toLowerCase();
  
  if (r.includes("multiple") || r.includes("people")) {
    return {
      Icon: UserIcon,
      title: "More than one person detected",
      description: "Please upload a photo with one person only."
    };
  }
  
  if (r.includes("crop") || r.includes("partial") || r.includes("incomplete") || r.includes("knees")) {
    return {
      Icon: CropIcon,
      title: "This image is cropped",
      description: "Please include the full outfit in the frame (head to knees)."
    };
  }
  
  if (r.includes("blurry") || r.includes("light") || r.includes("unclear") || r.includes("dark") || r.includes("flash")) {
    return {
      Icon: SunIcon,
      title: "This image is too unclear",
      description: "Try better lighting or a steadier shot without mirror flash."
    };
  }
  
  if (r.includes("duplicate") || r.includes("already") || r.includes("identical") || r.includes("same outfit")) {
    return {
      Icon: RepeatIcon,
      title: "Duplicate outfit detected",
      description: "You've already analyzed this look. Try a different combination or new pieces."
    };
  }

  // Default: Shirtless / Nudity / Swimwear / Inappropriate or generic
  return {
    Icon: TShirtIcon,
    title: "This image can’t be analyzed",
    description: reason || "The outfit isn’t fully visible or follows app guidelines."
  };
};

export const UploadPage: React.FC<UploadPageProps> = ({
  imagePreviewUrl,
  selectedStyle,
  selectedOccasion,
  customOccasion,
  isAnalyzing,
  isValidated,
  validationMsg,
  onBack,
  onImageSelected,
  onStyleSelect,
  onOccasionSelect,
  onCustomOccasionChange,
  onAnalyze,
  validationStatus = 'idle',
  isOffline,
}) => {
  const [uploadError, setUploadError] = useState<{ title: string; subtitle: string } | null>(null);

  const showButtonLoading = isAnalyzing && isValidated;
  const analysisInProgress = isAnalyzing && isValidated;
  
  const isCTAEnabled =
  !isOffline &&
  validationStatus === 'accepted' &&
  (selectedOccasion || customOccasion.trim()) &&
  !isAnalyzing;

  const validationUI = useMemo(() => getValidationUI(validationMsg), [validationMsg]);

  const isCustomPopulated = customOccasion.length > 0;

  const handleReset = () => {
    onImageSelected(null as any, null as any);
  };

  return (
    <div className={`min-h-screen bg-classik-beige text-classik-black font-manrope selection:bg-classik-dark/10 overflow-x-hidden relative ${validationStatus === 'rejected' ? 'h-screen overflow-hidden' : ''}`}>
      
      {/* Background Blur Overlay for Rejection */}
      <div className={`fixed inset-0 z-[55] bg-classik-beige/30 backdrop-blur-md transition-opacity duration-500 pointer-events-none ${validationStatus === 'rejected' ? 'opacity-100' : 'opacity-0'}`} />

      {/* Header - Always visible for navigation */}
      <header className="sticky top-0 z-50 w-full bg-classik-beige/90 backdrop-blur-xl border-b border-classik-dark/5">
        <div className="max-w-md mx-auto px-6 py-6 flex items-center justify-between">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/60 text-classik-black/70 hover:bg-white/60 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
             <h1 className="text-[11px] font-black uppercase tracking-[0.25em] text-classik-black/80">New Analysis</h1>
             <p className="text-[8px] font-bold text-classik-taupe uppercase tracking-widest mt-1 opacity-60 italic">Quality check your look</p>
          </div>

          <div className="w-10" />
        </div>
      </header>

      <main className={`max-w-md mx-auto px-6 pt-8 pb-40 transition-all duration-500 ${validationStatus === 'rejected' ? 'blur-sm grayscale-[0.2]' : ''}`}>
        
        {/* Upload Area */}
        <section className="animate-fade-in mb-10">
          <UploadZone 
            imagePreviewUrl={imagePreviewUrl} 
            onImageSelected={onImageSelected}
            uploadError={uploadError}
            onError={(title, subtitle) => setUploadError({ title, subtitle })}
          />
        </section>

        {/* Phase 2: Form Options */}
        {imagePreviewUrl && (
          <div className="space-y-12 animate-fade-in">
            <section>
              <PersonalitySelector
                selected={selectedStyle}
                onSelect={onStyleSelect}
                disabled={analysisInProgress}
              />
            </section>

            <section>
              <SelectionGroup
                title="Where are you heading?"
                options={Object.values(OccasionPreset)}
                selected={isCustomPopulated ? null : selectedOccasion}
                onSelect={(val) => onOccasionSelect(val)}
                disabled={analysisInProgress || isCustomPopulated}
              />
            </section>

            <section>
              <div className="flex flex-col gap-4">
                <h3 className="text-classik-black text-sm font-bold tracking-widest ml-1 uppercase opacity-80">
                  Something specific?
                </h3>
                <div className="relative">
                  <textarea
                    value={customOccasion}
                    onChange={(e) => {
                      const val = e.target.value;
                      onCustomOccasionChange(val);
                      if (val.length > 0 && selectedOccasion) {
                        onOccasionSelect(null);
                      }
                    }}
                    placeholder="Wedding, Class, Birthday dinner..."
                    disabled={analysisInProgress}
                    className="w-full h-32 bg-white/40 backdrop-blur-md border border-white/60 rounded-[32px] p-6 text-sm font-medium text-classik-black placeholder:text-classik-black/20 focus:outline-none focus:border-classik-dark/20 transition-all shadow-sm resize-none"
                  />
                </div>
              </div>
            </section>

            {validationStatus === 'accepted' && (
              <div className="flex flex-col items-center gap-1 animate-fade-in">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-dark/40">
                  All set. Outfit is ready for analysis.
                </span>
              </div>
            )}

            {validationStatus === 'pending' && (
              <div className="flex items-center justify-center gap-3 py-4 bg-classik-dark/5 rounded-full border border-classik-dark/10 animate-pulse">
                <div className="w-3 h-3 border-2 border-classik-dark/30 border-t-classik-dark rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-classik-dark/60">Checking outfit...</span>
              </div>
            )}

            {isOffline && (
  <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 text-center mb-3">
    You’re offline. Connect to continue.
  </p>
)}

<div className={`pt-4 ${validationStatus === 'rejected' ? 'invisible' : ''}`}>
  <FloatingActionButton 
    onClick={onAnalyze}
    disabled={!isCTAEnabled}
    isAnalyzing={showButtonLoading}
  />
</div>
          </div>
        )}
      </main>

      {/* Validation Rejection Overlay Card */}
      {validationStatus === 'rejected' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
          <div className="w-full max-w-[320px] bg-white/40 backdrop-blur-[40px] border border-white/80 rounded-[40px] p-10 shadow-[0_30px_60px_rgba(80,49,29,0.15)] pointer-events-auto relative animate-slide-up-sheet">
            {/* Close Button */}
            <button 
              onClick={handleReset}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-classik-black/5 text-classik-black hover:bg-classik-black/10 transition-all active:scale-90"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-classik-dark/5 border border-classik-dark/10 flex items-center justify-center mb-6">
                <validationUI.Icon className="w-7 h-7 text-classik-dark/40" />
              </div>
              
              <h3 className="text-classik-black font-black text-lg tracking-tight mb-3">
                {validationUI.title}
              </h3>
              
              <p className="text-classik-taupe text-[14px] leading-relaxed font-medium mb-10">
                {validationUI.description}
              </p>

              <button 
                onClick={handleReset}
                className="w-full h-14 rounded-full bg-classik-dark text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
              >
                Upload a different photo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full h-40 bg-gradient-to-t from-classik-beige via-classik-beige/95 to-transparent pointer-events-none z-40" />
    </div>
  );
};
