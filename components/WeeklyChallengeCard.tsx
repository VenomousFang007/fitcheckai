import React, { useState } from "react";

interface WeeklyChallengeCardProps {
  challenge: any;
}

const WeeklyChallengeCard: React.FC<WeeklyChallengeCardProps> = ({ challenge }) => {
  if (!challenge) return null;

  const progressPercent =
    challenge.target > 0
      ? Math.min((challenge.progress / challenge.target) * 100, 100)
      : 0;


  return (
  <div className="
    relative
    w-full
    rounded-3xl
    bg-white/20
    backdrop-blur-xl
    border border-white/40
    shadow-[0_8px_32px_rgba(0,0,0,0.05)]
    p-5
    transition-all
    duration-300
    hover:bg-white/25
    hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]
  ">

    {/* Glass light reflection layer */}
    <div className="
      absolute inset-0 rounded-3xl
      bg-gradient-to-br
      from-white/30
      to-transparent
      pointer-events-none
    " />

    <div className="relative z-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black tracking-[0.3em] text-black/40 uppercase">
          Weekly Challenge
        </span>

        <span className="
          text-[10px]
          font-semibold
          px-2.5 py-1
          rounded-full
          bg-white/30
          backdrop-blur-sm
          border border-white/40
          text-black/70
        ">
          INT {challenge.primary_intensity_level}
        </span>
      </div>

      {/* Primary Challenge */}
      <p className="text-sm font-semibold text-black leading-snug line-clamp-2">
        {challenge.primary_challenge}
      </p>

      {/* Progress */}
      <div className="mt-4">
        {challenge.primary_status === "completed" ? (
          <div className="text-xs font-semibold text-emerald-600">
            COMPLETED
          </div>
        ) : (
          <>
            <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-classik-warm transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="text-xs text-black/50 mt-2 font-medium">
              {challenge.progress} / {challenge.target}
            </div>
          </>
        )}
      </div>

    </div>
  </div>
);
};
export default WeeklyChallengeCard;