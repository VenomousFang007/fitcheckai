import { AnalysisResult, ImprovementPlan } from './types';

export interface OutfitContext {
  outfitId: string;        // OutfitData.id_uuid
  imageUrl: string;
  title: string;
  analyzedAt: string;

  analysisResult: AnalysisResult;

  improvementPlan: ImprovementPlan | null;

  weatherContext?: {
    currentConditions: string;
    weatherNote?: string;
  };
}