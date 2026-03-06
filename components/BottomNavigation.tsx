
import React from 'react';
import { Home, FileText, Sliders, Fingerprint } from 'lucide-react';
// Import NavTab from common types
import { NavTab } from '../types';

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  const tabs = [
    { id: NavTab.HOME, label: 'Home', Icon: Home },
    { id: NavTab.RESULTS, label: 'Results', Icon: FileText },
    { id: NavTab.IMPROVE, label: 'Improve', Icon: Sliders },
    { id: NavTab.DNA, label: 'Style DNA', Icon: Fingerprint }
  ];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[400px]">
      <nav className="h-[60px] bg-white/80 backdrop-blur-[12px] border border-white/30 rounded-[20px] px-4 flex items-center justify-around shadow-[0_8px_32px_rgba(0,0,0,0.08)] font-manrope">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`
                relative flex flex-col items-center justify-center gap-1 w-16 h-full
                transition-all duration-300
              `}
            >
              <div className={`
                flex items-center justify-center transition-all duration-300
                ${isActive ? 'scale-110' : 'scale-100'}
              `}>
                <Icon size={20} className={`
                  ${isActive ? 'text-classik-dark stroke-[2.5px]' : 'text-classik-black/40 stroke-[2px]'}
                `} />
              </div>
              <span className={`
                text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-300
                ${isActive ? 'text-classik-dark opacity-100' : 'text-classik-black/40 opacity-60'}
              `}>
                {label}
              </span>
              
              {isActive && (
                <div className="absolute -bottom-1.5 w-1 h-1 bg-classik-dark rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
