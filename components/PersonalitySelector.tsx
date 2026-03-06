import React from 'react';
import { FeedbackStyle } from '../types';

interface PersonalitySelectorProps {
  selected: FeedbackStyle;
  onSelect: (style: FeedbackStyle) => void;
  disabled?: boolean;
}

// Final Locked Personality Color System
const PERSONALITY_CONFIG = {
  [FeedbackStyle.MOTIVATING]: {
    selectedBg: '#8C5A2B', // Burnt Amber
    activeBg: '#704822',
    text: '#FFFFFF',
    label: "Motivating",
    description: "An inspiring stylist in your pocket. Expect high energy, praise, and enthusiastic guidance to make you shine."
  },
  [FeedbackStyle.PLAYFUL]: {
    selectedBg: '#9FB3A1', // Warm Sage
    activeBg: '#7F8F81',
    text: '#FFFFFF',
    label: "Playful",
    description: "Lighthearted and fun. Friendly style advice mixed with fashion-forward energy and ease."
  },
  [FeedbackStyle.SARCASTIC]: {
    selectedBg: '#3F3F46', // Smoked Charcoal
    activeBg: '#27272A',
    text: '#FFFFFF',
    label: "Sarcastic",
    description: "Witty critique that targets the clothes, not you. Honest, funny, and definitely helpful."
  },
  [FeedbackStyle.PROFESSIONAL]: {
    selectedBg: '#5F6F82', // Muted Slate Blue
    activeBg: '#4C5968',
    text: '#FFFFFF',
    label: "Professional",
    description: "Direct, actionable, and polished. Precise feedback on fit and coordination for business or formal events."
  }
};

const BASE_STYLE = {
  bg: '#EFEAE2',
  border: '#D4CABC',
  text: '#0B090C'
};

export const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({ selected, onSelect, disabled }) => {
  return (
    <div className={`flex flex-col gap-4 font-manrope transition-opacity duration-500 ${disabled ? 'opacity-40' : 'opacity-100'}`}>
      <div className="flex flex-col gap-1">
        <h3 className="text-classik-black text-sm font-bold tracking-widest ml-1 uppercase opacity-80">
          Choose personality feedback
        </h3>
        <p className="text-classik-black/40 text-xs font-medium italic tracking-wide ml-1">
          How should the AI talk to you?
        </p>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {(Object.values(FeedbackStyle) as FeedbackStyle[]).map((style) => {
          const config = PERSONALITY_CONFIG[style];
          const isSelected = selected === style;
          
          return (
            <button
              key={style}
              disabled={disabled}
              onClick={() => !disabled && onSelect(style)}
              style={{
                backgroundColor: isSelected ? config.selectedBg : BASE_STYLE.bg,
                color: isSelected ? config.text : BASE_STYLE.text,
                borderColor: isSelected ? config.selectedBg : BASE_STYLE.border,
              }}
              onMouseDown={(e) => {
                if (!disabled && isSelected) e.currentTarget.style.backgroundColor = config.activeBg;
              }}
              onMouseUp={(e) => {
                if (!disabled && isSelected) e.currentTarget.style.backgroundColor = config.selectedBg;
              }}
              className={`
                px-6 py-3 rounded-full text-sm font-bold tracking-tight border
                transition-all duration-200 ease-in-out
                ${disabled ? 'cursor-not-allowed' : isSelected 
                  ? 'cursor-default shadow-none' 
                  : 'hover:border-classik-black/20 active:scale-95'
                }
              `}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Description Area */}
      <div className="min-h-[4.5rem] mt-1 ml-1 flex items-start overflow-hidden relative">
        <p 
          key={selected} 
          className="text-sm font-medium leading-relaxed tracking-tight animate-fade-in"
          style={{ 
            color: PERSONALITY_CONFIG[selected].selectedBg,
            opacity: 0.8
          }}
        >
          {PERSONALITY_CONFIG[selected].description}
        </p>
      </div>
    </div>
  );
};