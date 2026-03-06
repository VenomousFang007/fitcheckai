import { HistoryEntry } from '../types';

export type StyleSummary = {
  avgScoreThisMonth: number | null;
  avgScoreLastMonth: number | null;
  delta: number | null;
  bestCategoryThisMonth: string | null;
  totalOutfitsThisMonth: number;
};

/**
 * Get the start of a calendar month (day 1, 00:00:00)
 */
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get the end of a calendar month (last day, 23:59:59.999)
 */
function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Check if a date falls within a specific calendar month
 */
function isInMonth(dateString: string, monthStart: Date, monthEnd: Date): boolean {
  const date = new Date(dateString);
  return date >= monthStart && date <= monthEnd;
}

/**
 * Calculate average score from history items, returns null if empty
 */
function calculateAverage(items: HistoryEntry[]): number | null {
  if (items.length === 0) return null;
  const sum = items.reduce((acc, item) => acc + item.score, 0);
  return Math.round((sum / items.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Find the category with the highest average score
 */
function getBestCategory(items: HistoryEntry[]): string | null {
  // Filter out items without a category
  const itemsWithCategory = items.filter(item => item.occasion && item.occasion.trim() !== '');
  
  if (itemsWithCategory.length === 0) return null;
  
  // Group by category and calculate averages
  const categoryScores = new Map<string, number[]>();
  
  itemsWithCategory.forEach(item => {
    const category = item.occasion!;
    if (!categoryScores.has(category)) {
      categoryScores.set(category, []);
    }
    categoryScores.get(category)!.push(item.score);
  });
  
  // Find category with highest average
  let bestCategory: string | null = null;
  let highestAvg = -1;
  
  categoryScores.forEach((scores, category) => {
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (avg > highestAvg) {
      highestAvg = avg;
      bestCategory = category;
    }
  });
  
  return bestCategory;
}

/**
 * Generate style insights from history entries
 */
export function getStyleSummary(historyItems: HistoryEntry[]): StyleSummary {
  const now = new Date();
  
  // This month boundaries
  const thisMonthStart = getMonthStart(now);
  const thisMonthEnd = getMonthEnd(now);
  
  // Last month boundaries
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = getMonthStart(lastMonthDate);
  const lastMonthEnd = getMonthEnd(lastMonthDate);
  
  // Filter items by month
  const thisMonthItems = historyItems.filter(item =>
    isInMonth(item.timestamp, thisMonthStart, thisMonthEnd)
  );
  
  const lastMonthItems = historyItems.filter(item =>
    isInMonth(item.timestamp, lastMonthStart, lastMonthEnd)
  );
  
  // Calculate averages
  const avgScoreThisMonth = calculateAverage(thisMonthItems);
  const avgScoreLastMonth = calculateAverage(lastMonthItems);
  
  // Calculate delta
  let delta: number | null = null;
  if (avgScoreThisMonth !== null && avgScoreLastMonth !== null) {
    delta = Math.round((avgScoreThisMonth - avgScoreLastMonth) * 10) / 10;
  }
  
  // Find best category this month
  const bestCategoryThisMonth = getBestCategory(thisMonthItems);
  
  return {
    avgScoreThisMonth,
    avgScoreLastMonth,
    delta,
    bestCategoryThisMonth,
    totalOutfitsThisMonth: thisMonthItems.length,
  };
}