// ============================================================================
// Weather System Types
// ============================================================================

export type Intent =
  | 'outfit_of_the_day'
  | 'date_night'
  | 'tonight'
  | 'later_today'
  | 'tomorrow'
  | 'work'
  | 'now';

export interface WeatherContext {
  intent: Intent;
  timeWindow: {
    label: string;
    startHour: number;
    endHour: number;
  };
  currentConditions: {
    temp: number;
    condition: string;
    icon: string;
    label: string;
  } | null;
  relevantForecast: {
    morning: any;
    afternoon: any;
    evening: any;
    night: any;
  } | null;
  weatherNote: string;
}


export enum FeedbackStyle {
  MOTIVATING = 'Motivating',
  PLAYFUL = 'Playful',
  PROFESSIONAL = 'Professional',
  SARCASTIC = 'Sarcastic',
}

export enum OccasionPreset {
  CASUAL = 'Casual',
  WORK = 'Work',
  DATE = 'Date',
  PARTY = 'Party',
  EVENT = 'Event',
}

// Centrally defined navigation tabs to ensure consistency across the app
export enum NavTab {
  HOME = 'home',
  RESULTS = 'results',
  IMPROVE = 'improve',
  IMPROVE_PROCESSING = 'improve_processing',  // ← ADD THIS LINE
  DNA = 'dna'
}


export type ValidationFailureType =
  | 'MULTIPLE_PEOPLE'
  | 'TOO_DARK'
  | 'PARTIAL_OUTFIT'
  | 'OUTFIT_NOT_VISIBLE'
  | 'NON_FASHION'
  | 'INAPPROPRIATE_CONTENT'
  | 'PORTRAIT_ONLY'
  | 'ANIMAL_DETECTION'
  | 'NON_HUMAN'
  | 'DUPLICATE_IMAGE'
  | 'GENERIC';

export interface AnalysisResult {
  score: number;
  breakdown: {
    harmony: number;
    fitBalance: number;
    styleAlignment: number;
    styleIntent: number;
  };
  headline: string;
  feedback: string;
  palette: string[];
  styleMetrics: {
    topType: string;
    bottomType: string;
    footwearType: string;
    outerwear: boolean;
    layeringLevel: "single" | "light-layer" | "heavy-layer";
    colorTemperature: "warm" | "cool" | "neutral" | "mixed";
  };
}

export interface ImprovementPlan {
  winningElements: string[];
  diagnosticSummary: {
    primaryIssue: string;
    secondaryIssue: string;
    alignmentImpact: string;
  };
  problemStatements: string[];
  improvementSections: {
    title: string;
    whyMatters: string;
    styleImpact: string;
    actionSteps: string[];
  }[];
  advancedInsights: string[];
  outfitWeatherProfile?: {
    coverage: 'light' | 'medium' | 'heavy';
    layering: 'single' | 'layered' | 'heavy-layered';
    fabricWeight: 'light' | 'mid' | 'heavy';
  } | null;
}

export interface WeatherStyleNote {
  condition: string; // ✅ must be string, not union
  summary: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  imageUrl: string;
  score: number;
  alignment: 'STRONG ALIGNMENT' | 'MODERATE ALIGNMENT' | 'LOW ALIGNMENT';
  comparison: string;
  data: AnalysisResult;
}

export interface ProfileInsights {
  styleIdentity: {
    label: string;
    description: string;
  };
  editorInsight: string;
  signaturePalette: {
    name: string;
    hex: string;
    reason: string;
  }[];
  silhouetteFits: string;
  whereItWorksBest: string;
  lastUpdated: string;
}

export interface UploadState {
  imagePreviewUrl: string | null;
  selectedStyle: FeedbackStyle;
  selectedOccasion: OccasionPreset | null;
  customOccasion: string;
  isAnalyzing: boolean;
  isGeneratingPlan: boolean;
  analysisResult: AnalysisResult | null;
  improvementPlan: ImprovementPlan | null;
  isHome: boolean;
  isHistory: boolean;
  isProfile: boolean;
  isStyleDNA: boolean;
  fromHistory?: boolean;
  validationError?: ValidationFailureType | null;
}

export interface OutfitContext {
  outfitId: string; // ✅ Must be non-null
  imageUrl: string;
  title: string;
  analyzedAt: string; // ✅ ISO timestamp
  analysisResult: AnalysisResult;
  improvementPlan: ImprovementPlan | null;
  weatherContext?: WeatherContext; // ✅ NEW: Full weather context
  weatherIntent?: Intent; // ✅ NEW: When user plans to wear outfit
}

// ============================================================================
// Monetization / Paywall Types
// ============================================================================

export type SubscriptionTier = 'free' | 'premium';
export type PaywallTrigger = 'improve_tips' | 'style_ai' | 'style_dna' | 'daily_limit' | 'profile_upgrade';

