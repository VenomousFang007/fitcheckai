
import React, { useEffect, useState, useRef } from 'react';
import { FeedbackStyle } from '../types';
import { CalendarIcon } from './Icons';

interface StyleStreakProps {
  streak: number;
  selectedStyle?: FeedbackStyle; 
  justUpdated?: boolean;
  className?: string;
  onClick?: () => void;
  onToggle?: (isOpen: boolean) => void;
  isStatic?: boolean;
}

const STREAK_PHASES = [
  { min: 30, name: "Signature Authority", descriptor: "Your wardrobe is no longer just clothes; it’s a cohesive expression of your identity." },
  { min: 22, name: "Defined Perspective", descriptor: "You are navigating trends with a focus on what truly resonates with your frame." },
  { min: 15, name: "Aesthetic Realignment", descriptor: "Your personal style is moving from exploration to a defined visual language." },
  { min: 8,  name: "Established Routine", descriptor: "Showing up every day is refining your eye for detail and proportion." },
  { min: 4,  name: "Rhythmic Progression", descriptor: "Consistency is starting to reveal the subtle patterns in your daily choices." },
  { min: 1,  name: "Foundation Set", descriptor: "You’ve taken the first step toward a more intentional wardrobe." },
  { min: 0,  name: "Status Paused", descriptor: "The journey is waiting. Resume when you're ready." }
];

export const StyleStreak: React.FC<StyleStreakProps> = ({ 
  streak, 
  selectedStyle = FeedbackStyle.MOTIVATING,
  justUpdated = false, 
  className = '',
  onClick,
  onToggle,
  isStatic = false
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (justUpdated) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 1500); 
      return () => clearTimeout(timer);
    }
  }, [justUpdated]);

  useEffect(() => {
    if (onToggle) onToggle(showTooltip);
  }, [showTooltip, onToggle]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showTooltip) {
      timer = setTimeout(() => setShowTooltip(false), 3500); // Refined to ~3.5s for calm acknowledgment
    }
    return () => clearTimeout(timer);
  }, [showTooltip]);

  const handleInteraction = (e: React.MouseEvent) => {
    if (isStatic) return;
    e.stopPropagation();
    setShowTooltip(!showTooltip);
    if (onClick) onClick();
  };

  const hasStreak = streak >= 1;
  const currentPhase = STREAK_PHASES.find(p => streak >= p.min) || STREAK_PHASES[STREAK_PHASES.length - 1];
  
  // Refined Habit Tracker Styling for the trigger button
  const primaryIconColor = '#50311d';
  const currentIconColor = hasStreak ? primaryIconColor : 'rgba(80, 49, 29, 0.2)';

  return (
    <div className="relative z-50 font-manrope">
      {/* Interaction Trigger */}
      <div 
        ref={buttonRef}
        onClick={handleInteraction}
        className={`
          relative group flex items-center justify-center gap-2 w-11 h-11 rounded-full transition-all duration-500 outline-none
          bg-white/20 backdrop-blur-md border border-classik-dark/10
          ${isStatic ? 'cursor-default' : 'cursor-pointer hover:bg-white/30 hover:border-classik-dark/20'}
          ${isUpdating ? 'scale-110' : ''}
          ${streak >= 30 ? 'shadow-[0_8px_20px_rgba(80,49,29,0.08)]' : 'shadow-sm'}
          ${className}
        `}
      >
        <div 
          className={`relative w-5 h-5 flex items-center justify-center transition-transform duration-500 ease-out ${isUpdating ? 'scale-125' : ''}`}
          style={{ color: currentIconColor }}
        >
          <CalendarIcon className="w-full h-full" />
        </div>

        {hasStreak && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-classik-dark rounded-full flex items-center justify-center border-2 border-classik-beige shadow-sm">
            <span className="text-[10px] font-black text-white leading-none">
              {streak}
            </span>
          </div>
        )}
      </div>

      {/* STREAK OVERLAY - Redesigned as a centered notification */}
      {showTooltip && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 animate-fade-in"
          onClick={() => setShowTooltip(false)}
        >
          {/* Internal Backdrop for extra focus */}
          <div className="absolute inset-0 bg-classik-black/40 backdrop-blur-[2px]" />
          
          <div 
            ref={tooltipRef}
            className="w-full max-w-[300px] bg-classik-black/95 backdrop-blur-xl border border-white/5 rounded-[32px] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden -translate-y-12 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Visual Polish */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex flex-col gap-2 relative z-10 text-center">
              <div className="flex flex-col items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-taupe/60 mb-3">
                  Consistency Check
                </span>
                {/* Refined Icon Container: Soft backing plate for clarity */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 mb-1 transition-all duration-700 shadow-[0_0_20px_rgba(232,223,210,0.03)] ${hasStreak ? 'scale-100 opacity-100' : 'scale-90 opacity-40'}`}>
                  {/* High clarity ivory/beige icon color */}
                  <CalendarIcon className="w-6 h-6 text-classik-beige" />
                </div>
              </div>
              
              <h4 className="text-classik-beige font-black text-xl tracking-tight mb-2">
                {currentPhase.name}
              </h4>
              
              <p className="text-[13px] font-medium text-classik-taupe/80 leading-relaxed italic px-2">
                {currentPhase.descriptor}
              </p>
              
              {hasStreak && (
                <div className="mt-6 pt-5 border-t border-white/5 flex flex-col items-center">
                   <div className="flex items-baseline gap-1.5">
                     <span className="text-3xl font-black text-white tracking-tighter tabular-nums">{streak}</span>
                     {/* Increased emphasis on the label */}
                     <span className="text-[10px] font-black text-classik-beige/80 uppercase tracking-widest">Day Streak</span>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
