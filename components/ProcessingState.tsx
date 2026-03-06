
import React, { useEffect, useState } from 'react';

interface ProcessingStateProps {
  imagePreviewUrl: string | null;
  mode?: 'analysis' | 'improvement';
}

const ANALYSIS_MESSAGES = [
  { prefix: "Assessing ", highlight: "Color Harmony", suffix: "…" },
  { prefix: "Evaluating ", highlight: "Your Fit", suffix: "…" },
  { prefix: "Reviewing ", highlight: "Silhouette Flow", suffix: "…" },
  { prefix: "Interpreting ", highlight: "Styling Intent", suffix: "…" },
  { prefix: "Analyzing ", highlight: "Proportions and Balance", suffix: "…" }
];

const IMPROVEMENT_MESSAGES = [
  { prefix: "Detecting ", highlight: "Visual Friction", suffix: "…" },
  { prefix: "Calibrating ", highlight: "Proportion Balance", suffix: "…" },
  { prefix: "Refining ", highlight: "Aesthetic Cohesion", suffix: "…" },
  { prefix: "Curating ", highlight: "Style Adjustments", suffix: "…" },
  { prefix: "Finalizing ", highlight: "Editorial Insights", suffix: "…" }
];

export const ProcessingState: React.FC<ProcessingStateProps> = ({ imagePreviewUrl, mode = 'analysis' }) => {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  const messages = mode === 'improvement' ? IMPROVEMENT_MESSAGES : ANALYSIS_MESSAGES;

  useEffect(() => {
    setIndex(0);
    setShow(true);
  }, [mode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setShow(true);
      }, 500);
    }, 3000); 

    return () => clearInterval(interval);
  }, [messages.length]);

  const current = messages[index];

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] flex items-center justify-center bg-[#D4CABC]/80 backdrop-blur-md animate-fade-in">

      
      {/* 1. Grain Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* 2. Main Glass Card */}
      <div className="relative z-10 w-[85%] max-w-[340px] aspect-[4/5] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(80,49,29,0.1)]">
        {/* Card Background: Classik Neutral Glass */}
        <div className="absolute inset-0 bg-[#EFEAE2]/85 backdrop-blur-lg border border-[#D4CABC]" />
        
        {/* Card Content */}
<div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">

           
           {/* Minimal Loading Indicator: Soft Pulse Ring */}
           <div className="relative w-16 h-16 mb-10 flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border-2 border-[#50311D]/10 scale-100" />
             <div className="absolute inset-0 rounded-full border-2 border-[#50311D] animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20" />
             <div className="w-8 h-8 rounded-full border-[1.5px] border-[#50311D] border-t-transparent animate-[spin_3s_linear_infinite]" />
           </div>

           {/* Rotating Text Area */}
           <div className="h-28 flex flex-col items-center justify-center w-full">
              <div className={`
                transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] transform
                ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}>
                <h2 className="text-lg font-medium text-[#806248] leading-relaxed tracking-tight">
                  {current.prefix}
                  <span className="text-[#50311D] font-bold">
                    {current.highlight}
                  </span>
                  {current.suffix}
                </h2>
                
                {/* Secondary Micro-copy */}
                <p className="mt-3 text-[11px] font-medium text-[#806248]/70 tracking-wide">
                  {mode === 'analysis' ? 'Synthesizing proportions and intent' : 'Aligning editorial perspective'}
                </p>
              </div>
           </div>
           
        </div>
      </div>
    </div>
  );
};
