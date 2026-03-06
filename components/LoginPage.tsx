import React from 'react';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#0D0D0D] text-white flex flex-col items-center justify-center px-6 py-12 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#12E5C3]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FF5C5C]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-sm flex flex-col items-center z-10 text-center">
        <h1 className="text-3xl font-black tracking-tight mb-2 uppercase">
          FitCheck<span className="text-[#12E5C3]">AI</span>
        </h1>
        <p className="text-white/40 text-sm mt-4">
          Authentication is currently disabled for this version.
        </p>
      </div>
    </div>
  );
};