import { HistoryEntry } from '../types';
import { StyleSummary } from './styleInsights';

export type InlineInsight = {
  label: string;
  tone: 'positive' | 'neutral' | 'negative';
};

export function getInlineInsight(
  item: HistoryEntry,
  summary: StyleSummary
): InlineInsight | null {
  if (summary.avgScoreThisMonth === null) return null;

  const diff = item.score - summary.avgScoreThisMonth;

  if (diff >= 5) {
    return {
      label: 'Outperforming your norm',
      tone: 'positive',
    };
  }

  if (diff <= -5) {
    return {
      label: 'Below your recent standard',
      tone: 'negative',
    };
  }

  return null;
}