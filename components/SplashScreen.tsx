
import React, { useEffect, useState } from 'react';
import { FitCheckLogo } from "./FitCheckLogo";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 1. Remain fully visible for ~2s to establish the premium atmosphere
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2200);

    // 2. Allow transition to finish before unmounting
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
     <div 
      className={`
    fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-classik-beige
    transition-opacity duration-1000 ease-in-out
    ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}
  `}
>

      {/* Background Ambience - Extremely subtle warm wash */}
      <div className="absolute inset-0 bg-gradient-to-tr from-classik-warm/5 via-transparent to-classik-taupe/5 opacity-40 pointer-events-none" />
      
<div className="flex flex-col items-center text-center z-10 animate-fade-in px-8">
  
  {/* Brand lockup */}
  <div className="flex flex-col items-center">
    <FitCheckLogo className="w-56 md:w-96 text-[#5a4636] mb-8" />
    
    <h1 className="text-3xl md:text-4xl font-black tracking-[0.25em] uppercase text-classik-black -mt-2">
      FitCheck<span className="text-classik-dark">AI</span>
    </h1>
  </div>
          <div className="w-8 h-[1px] bg-classik-dark/20 mb-6" />
          <p className="text-[11px] font-bold text-classik-taupe uppercase tracking-[0.4em] italic opacity-80">
            Where Style Meets Intelligence
         </p>
      </div>

      {/* Subtle brand anchor at bottom */}
      <div className="absolute bottom-12 flex flex-col items-center animate-fade-in" style={{ animationDelay: '400ms' }}>
         <span className="text-[9px] font-black uppercase tracking-[0.5em] text-classik-black/10">
            Ascendra System
         </span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-calm {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in-calm 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}} />
    </div>
  );
};
