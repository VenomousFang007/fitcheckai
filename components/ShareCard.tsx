import React from 'react';
import { FeedbackStyle } from '../types';
import { FitCheckLogo } from './FitCheckLogo';

interface ShareCardProps {
  imageUrl: string;
  score: number;
  headline: string;
  explanation: string;
  style: FeedbackStyle;
}

const STYLE_COLORS: Record<FeedbackStyle, string> = {
  [FeedbackStyle.MOTIVATING]: '#8C5A2B',
  [FeedbackStyle.PLAYFUL]: '#9FB3A1',
  [FeedbackStyle.SARCASTIC]: '#3F3F46',
  [FeedbackStyle.PROFESSIONAL]: '#5F6F82',
};

// Helper for safe text truncation
const getSafeShareText = (text: string, maxLength = 180) => {
  if (!text) return '';
  let firstPara = text.split('\n\n')[0];
  if (firstPara.length > maxLength) {
    return firstPara.substring(0, maxLength).trim() + '...';
  }
  return firstPara;
};

export const ShareCard: React.FC<ShareCardProps> = ({
  imageUrl,
  score,
  headline,
  explanation,
  style,
}) => {
  const accent = STYLE_COLORS[style] || '#8C5A2B';
  const shareText = getSafeShareText(explanation);

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Manrope, system-ui, sans-serif',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* BACKGROUND LAYER */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* BOTTOM PANEL */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          minHeight: '40%',
          backgroundColor: 'rgba(245, 239, 233, 0.92)',
          padding: '80px 64px 100px 64px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        {/* SCORE SECTION - NEW: Top of Panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          {/* Score Number */}
          <span
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: '#50311d',
              lineHeight: 1.5,
              marginBottom: 8,
            }}
          >
            {Math.round(score)}
          </span>
          
          {/* Score Label */}
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '1.00em',
              textTransform: 'uppercase',
              color: 'rgba(63, 58, 51, 0.6)',
            }}
          >
            OUTFIT SCORE
          </span>
        </div>

        {/* HEADLINE */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.1,
            color: accent,
            textAlign: 'center',
            marginBottom: 32,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}
        >
          {headline}
        </div>

        {/* EXPLANATION */}
        <div
          style={{
            fontSize: 32,
            lineHeight: 1.5,
            fontStyle: 'italic',
            textAlign: 'center',
            color: '#3f3a33',
            marginBottom: 48,
            maxWidth: '90%',
          }}
        >
          {shareText}
        </div>

        {/* BRANDING */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
            opacity: 1,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(63, 58, 51, 0.6)',
            }}
          >
            Rated by FitCheck AI
          </span>
          <span
  style={{
    marginTop: 8,
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#6b5f52',
  }}
>
</span>

          <FitCheckLogo
            style={{
              width: 54,
              height: 54,
              color: '#50311d',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};