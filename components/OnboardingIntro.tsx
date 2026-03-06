import React, { useState } from "react";

interface OnboardingIntroProps {
  onComplete: () => void;
}

export const OnboardingIntro: React.FC<OnboardingIntroProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < 4) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-classik-beige flex flex-col items-center justify-center px-8 text-center">
  <div className="w-full max-w-sm flex flex-col items-center">

    {/* PROGRESS INDICATOR */}
<div className="flex gap-2 mb-10">
  {[0, 1, 2, 3, 4].map(i => (
    <div
      key={i}
      className={`w-2 h-2 rounded-full transition-all ${
        step === i
          ? "bg-classik-dark scale-125"
          : "bg-classik-dark/20"
      }`}
    />
  ))}
</div>
      
      {/* STEP CONTENT */}
<div
  key={step}
  className="min-h-[180px] flex flex-col justify-center transition-all duration-500 ease-out opacity-0 translate-y-2 animate-step"
>
  {step === 0 && (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-4">
        Welcome to FitCheck AI
      </h1>
      <p className="text-classik-taupe text-sm leading-relaxed max-w-sm">
        This isn’t a rating app. It’s a clarity tool for understanding how your outfit actually reads.
      </p>
    </>
  )}

  {step === 1 && (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-4">
        How scoring works
      </h1>
      <p className="text-classik-taupe text-sm leading-relaxed max-w-sm">
        Scores reflect fit, harmony, alignment, and intent — not trends, not brands, not opinions.
      </p>
    </>
  )}

  {step === 2 && (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-4">
        Understanding your score
      </h1>
      <div className="text-classik-taupe text-sm leading-relaxed max-w-sm space-y-3">
        <p>Your score is not about trends or brands.</p>
        <p>It reflects four things:</p>
        <ul className="list-disc list-inside space-y-1 text-left">
          <li>Fit and balance</li>
          <li>Color harmony</li>
          <li>Alignment</li>
          <li>Intent vs execution</li>
        </ul>
        <p>High scores mean clarity. Low scores mean opportunity.</p>
      </div>
    </>
  )}

  {step === 3 && (
  <>
    <h1 className="text-2xl font-black tracking-tight mb-6">
      What your score is built on
    </h1>

    <div className="w-full max-w-sm grid gap-4">
      <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-4 text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-black/40 mb-1">
          Fit & Balance
        </p>
        <p className="text-sm text-classik-taupe leading-relaxed">
          Proportion, silhouette, and how the outfit sits on your body.
        </p>
      </div>

      <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-4 text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-black/40 mb-1">
          Color Harmony
        </p>
        <p className="text-sm text-classik-taupe leading-relaxed">
          How colors relate, contrast, and support each other.
        </p>
      </div>

      <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-4 text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-black/40 mb-1">
          Intent vs Execution
        </p>
        <p className="text-sm text-classik-taupe leading-relaxed">
          What you aimed for versus what actually reads.
        </p>
      </div>
      <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-4 text-left">
  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-classik-black/40 mb-1">
    Style Alignment
  </p>
  <p className="text-sm text-classik-taupe leading-relaxed">
    How well the outfit matches the occasion, environment, and social context.
  </p>
</div>
    </div>
  </>
)}

  {step === 4 && (
    <>
      <h1 className="text-2xl font-black tracking-tight mb-4">
        What happens next
      </h1>
      <p className="text-classik-taupe text-sm leading-relaxed max-w-sm">
        Upload an outfit, get a breakdown, then refine your style with intent.
      </p>
    </>
  )}
</div>

      {/* ACTION */}
      <button
        onClick={next}
        className="mt-10 w-full max-w-xs h-14 rounded-full bg-classik-dark text-white font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98]"
      >
        {step < 4 ? "Continue" : "Begin Analysis"}
      </button>
   
   <style>
{`
  .animate-step {
    animation: stepFade 0.45s ease-out forwards;
  }

  @keyframes stepFade {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}
</style>
 </div>
    </div>
  );
};