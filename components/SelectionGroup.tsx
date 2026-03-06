
import React from 'react';

interface SelectionGroupProps<T extends string> {
  title: string;
  options: T[];
  selected: T | null;
  onSelect: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

export const SelectionGroup = <T extends string>({ 
  title, 
  options, 
  selected, 
  onSelect,
  className = "",
  disabled
}: SelectionGroupProps<T>) => {
  return (
    <div className={`flex flex-col gap-4 ${className} transition-opacity duration-500 ${disabled ? 'opacity-40' : 'opacity-100'}`}>
      <h3 className="text-classik-black text-sm font-bold tracking-widest ml-1 uppercase opacity-80">
        {title}
      </h3>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              disabled={disabled}
              onClick={() => !disabled && onSelect(option)}
              className={`
                px-6 py-3 rounded-full text-sm font-bold tracking-tight transition-all duration-500
                ${disabled ? 'cursor-not-allowed' : ''}
                ${isSelected 
                  ? 'bg-classik-dark text-white shadow-md transform scale-105' 
                  : 'bg-white/40 border border-white/60 text-classik-black/60 backdrop-blur-md hover:bg-white/60 hover:border-classik-dark/20 hover:scale-[1.03]'}
              `}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};
