import React from 'react';

interface NetworkBannerProps {
  status: 'online' | 'offline';
}

export const NetworkBanner: React.FC<NetworkBannerProps> = ({ status }) => {
  if (status === 'online') return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-red-600 text-white text-center text-xs font-bold tracking-wide py-2 animate-fade-in">
      Network unavailable. Some features may not work.
    </div>
  );
};