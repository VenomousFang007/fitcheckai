import { supabase } from "./supabase";

interface StyleMetrics {
  topType: string;
  bottomType: string;
  footwearType: string;
  outerwear: boolean;
  layeringLevel: "single" | "light-layer" | "heavy-layer";
  colorTemperature: "warm" | "cool" | "neutral" | "mixed";
}

interface StylistMemory {
  dominantBottom: { type: string | null; count: number };
  dominantFootwear: { type: string | null; count: number };
  layeringUsage: {
    single: number;
    "light-layer": number;
    "heavy-layer": number;
  };
  outerwearUsage: number;
  colorBias: {
    warm: number;
    cool: number;
    neutral: number;
    mixed: number;
  };
}

export async function generateStylistMemory(userId: string): Promise<StylistMemory | null> {
  const { data, error } = await supabase
    .from("OutfitData")
    .select("style_metrics")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(7);

  if (error || !data || data.length === 0) {
    console.error("Failed to fetch style metrics:", error);
    return null;
  }

  const bottomCount: Record<string, number> = {};
  const footwearCount: Record<string, number> = {};

  const layeringUsage = {
    single: 0,
    "light-layer": 0,
    "heavy-layer": 0,
  };

  let outerwearUsage = 0;

  const colorBias = {
    warm: 0,
    cool: 0,
    neutral: 0,
    mixed: 0,
  };

  data.forEach((row) => {
    const metrics: StyleMetrics = row.style_metrics;

    if (!metrics) return;

    // Bottom frequency
    bottomCount[metrics.bottomType] =
      (bottomCount[metrics.bottomType] || 0) + 1;

    // Footwear frequency
    footwearCount[metrics.footwearType] =
      (footwearCount[metrics.footwearType] || 0) + 1;

    // Layering
    if (layeringUsage[metrics.layeringLevel] !== undefined) {
      layeringUsage[metrics.layeringLevel]++;
    }

    // Outerwear
    if (metrics.outerwear) {
      outerwearUsage++;
    }

    // Color bias
    if (colorBias[metrics.colorTemperature] !== undefined) {
      colorBias[metrics.colorTemperature]++;
    }
  });

  const dominantBottom = Object.entries(bottomCount).sort(
    (a, b) => b[1] - a[1]
  )[0] || [null, 0];

  const dominantFootwear = Object.entries(footwearCount).sort(
    (a, b) => b[1] - a[1]
  )[0] || [null, 0];

  return {
    dominantBottom: {
      type: dominantBottom[0],
      count: dominantBottom[1],
    },
    dominantFootwear: {
      type: dominantFootwear[0],
      count: dominantFootwear[1],
    },
    layeringUsage,
    outerwearUsage,
    colorBias,
  };
}

interface StyleDiagnosis {
  bottomStagnant: boolean;
  footwearStagnant: boolean;
  layeringWeak: boolean;
  boldnessLow: boolean;
  temperatureBias: "warm" | "cool" | "neutral" | "mixed" | null;
}

export function detectStagnation(memory: StylistMemory): StyleDiagnosis {
  const totalLooks =
    memory.layeringUsage.single +
    memory.layeringUsage["light-layer"] +
    memory.layeringUsage["heavy-layer"];

  if (totalLooks === 0) {
    return {
      bottomStagnant: false,
      footwearStagnant: false,
      layeringWeak: false,
      boldnessLow: false,
      temperatureBias: null,
    };
  }

  const bottomStagnant =
    memory.dominantBottom.count / totalLooks >= 0.6;

  const footwearStagnant =
    memory.dominantFootwear.count / totalLooks >= 0.6;

  const layeringWeak =
    memory.layeringUsage.single / totalLooks >= 0.7;

  const boldnessLow =
    memory.colorBias.neutral / totalLooks >= 0.6;

  const dominantTemp = Object.entries(memory.colorBias).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const temperatureBias =
    dominantTemp && dominantTemp[1] / totalLooks >= 0.6
      ? (dominantTemp[0] as "warm" | "cool" | "neutral" | "mixed")
      : null;

  return {
    bottomStagnant,
    footwearStagnant,
    layeringWeak,
    boldnessLow,
    temperatureBias,
  };
}