import { callGemini } from '../lib/gemini';
import { supabase } from "../lib/supabase";
import { getStartOfWeek } from "./weekUtils";



/* ================================
   TYPES
================================ */

export interface StyleMetrics {
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

interface StyleDiagnosis {
  bottomStagnant: boolean;
  footwearStagnant: boolean;
  layeringWeak: boolean;
  boldnessLow: boolean;
  temperatureBias: "warm" | "cool" | "neutral" | "mixed" | null;
}

interface GeneratedChallenge {
  primary: string;
  bonus: string;
  focusArea: string;
  blockedValue: string | null;
  experimental?: string;
  reasoning?: string;
  confidenceScore?: number;
}

/* ================================
   STEP 1 — BUILD STYLIST MEMORY
================================ */

export async function generateStylistMemory(
  userId: string
): Promise<StylistMemory | null> {
  console.log('[Weekly Challenge] Fetching past 7 outfits to build memory...');
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

    bottomCount[metrics.bottomType] =
      (bottomCount[metrics.bottomType] || 0) + 1;

    footwearCount[metrics.footwearType] =
      (footwearCount[metrics.footwearType] || 0) + 1;

    if (layeringUsage[metrics.layeringLevel] !== undefined) {
      layeringUsage[metrics.layeringLevel]++;
    }

    if (metrics.outerwear) {
      outerwearUsage++;
    }

    if (colorBias[metrics.colorTemperature] !== undefined) {
      colorBias[metrics.colorTemperature]++;
    }
  });

  const dominantBottom =
    Object.entries(bottomCount).sort((a, b) => b[1] - a[1])[0] || [null, 0];

  const dominantFootwear =
    Object.entries(footwearCount).sort((a, b) => b[1] - a[1])[0] || [null, 0];

  const memoryOutput = {
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

  console.log('[Weekly Challenge] Stylist Memory Output:', memoryOutput);

  return memoryOutput;
}

/* ================================
   STEP 2 — DETECT STAGNATION
================================ */

export function detectStagnation(memory: StylistMemory): StyleDiagnosis {
  const bottomStagnant = memory.dominantBottom.count >= 4;
  const footwearStagnant = memory.dominantFootwear.count >= 4;
  const layeringWeak = memory.layeringUsage.single >= 5;
  const boldnessLow = memory.colorBias.neutral >= 4;

  const dominantTemp = Object.entries(memory.colorBias).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const temperatureBias =
    dominantTemp && dominantTemp[1] >= 4
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

/* ================================
   STEP 3 — DECIDE FOCUS AREA
================================ */

function decideFocus(diagnosis: StyleDiagnosis, recentFocusAreas: string[] = []): string {
  const options: string[] = [];
  if (diagnosis.bottomStagnant) options.push("bottom");
  if (diagnosis.footwearStagnant) options.push("footwear");
  if (diagnosis.layeringWeak) options.push("layering");
  if (diagnosis.boldnessLow) options.push("boldness");
  if (diagnosis.temperatureBias) options.push("temperature");

  const recentSet = new Set(recentFocusAreas);

  // Try to find a focus area that hasn't been used recently
  for (const opt of options) {
    if (!recentSet.has(opt)) return opt;
  }

  // If all detected issues were used recently, just use the first issue detected
  if (options.length > 0) return options[0];

  return "exploration";
}

/* ================================
   STEP 4 — GENERATE CHALLENGE TEXT
================================ */

export async function generateStyleChallenge(
  diagnosis: StyleDiagnosis,
  memory: StylistMemory,
  intensity: number,
  recentChallenges: any[] = []
): Promise<GeneratedChallenge> {
  console.log('[Weekly Challenge] Generating challenge using AI with prompt params:', { diagnosis, memory, intensity, recentChallenges });

  const recentFocusAreas = recentChallenges.map(c => c.primary_focus_area).filter(Boolean);
  const recentConstraints = recentChallenges.map(c => c.blocked_value).filter(Boolean);

  const antiDuplicationRules = recentFocusAreas.length > 0
    ? `\nANTI-DUPLICATION RULES (CRITICAL):\n- Do not generate a constraint for these recent focus areas if possible: ${recentFocusAreas.join(", ")}\n- Do not block these specific items again: ${recentConstraints.join(", ")}\n`
    : "";

  const prompt = `
You are operating inside a Style Challenge Engine.ts

You are NOT:
	•	A fashion analyzer
	•	A scoring system
	•	A weather advisor
	•	A motivational coach
	•	A conversational assistant

You only generate structured weekly challenges.

Your role:
Based on structured pattern memory provided, generate ONE intelligent weekly style challenge.

You must:
	•	Detect pattern repetition
	•	Identify comfort zones
	•	Design a structured challenge to expand the user's style range
	•	Adjust difficulty tone according to intensity (1–5)

Intensity Rules:
1–2 → Gentle expansion
3 → Moderate push
4 → Strong constraint
5 → Elite discipline challenge

Strict Boundaries:
	•	Do not analyze the outfit.
	•	Do not give improvement advice.
	•	Do not discuss weather.
	•	Do not mention AI.
	•	Do not reference other app features.
	•	Do not provide explanations beyond one reasoning sentence.
	•	Do not output anything except valid JSON.
${antiDuplicationRules}

If strong repetition exists:
→ Use constraint-based challenge (avoid X, replace X, invert X)

If layering is weak:
→ Introduce structural layering requirement

If neutral dominance:
→ Introduce color discipline

If user shows balance:
→ Introduce exploration challenge

Return STRICT JSON:

{
"primary": "string",
"bonus": "string",
"focusArea": "bottom | footwear | layering | boldness | temperature | exploration",
"blockedValue": "string or null",
"reasoning": "one sentence explaining why this challenge was selected",
"confidenceScore": number between 0 and 1
}

No markdown.
No commentary.
No extra text.

Data:
Memory: ${JSON.stringify(memory)}
Diagnosis: ${JSON.stringify(diagnosis)}
Intensity: ${intensity}
`;

  try {
    const response = await callGemini({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            primary: { type: "STRING" },
            bonus: { type: "STRING" },
            focusArea: {
              type: "STRING",
              enum: ["bottom", "footwear", "layering", "boldness", "temperature", "exploration"]
            },
            blockedValue: {
              type: "STRING",
              nullable: true
            },
            reasoning: { type: "STRING" },
            confidenceScore: { type: "NUMBER" }
          },
          required: ["primary", "bonus", "focusArea", "reasoning", "confidenceScore"]
        }
      }
    });

    let text: string | undefined;
    try {
      text = response;
    } catch (textError) {
      console.error("Failed to read response text:", textError);
      text = undefined;
    }

    if (text) {
      try {
        const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        console.log('[Weekly Challenge] AI Output:', parsed);
        return {
          primary: parsed.primary,
          bonus: parsed.bonus,
          focusArea: parsed.focusArea,
          blockedValue:
            parsed.blockedValue === "null" || !parsed.blockedValue
              ? null
              : parsed.blockedValue,
          reasoning: parsed.reasoning,
          confidenceScore: parsed.confidenceScore,
        };
      } catch (parseError) {
        // Log parse errors separately so you can distinguish a model failure
        // from a JSON formatting issue in production logs.
        console.error("Gemini response JSON parse failed:", parseError, "Raw text:", text);
      }
    }
  } catch (error) {
    console.error("Gemini challenge generation failed:", error);
  }

  // ── Fallback (deterministic) ──────────────────────────────────────────────
  const focus = decideFocus(diagnosis, recentFocusAreas);

  switch (focus) {
    case "bottom":
      return {
        focusArea: "bottom",
        primary: `This week, avoid wearing ${memory.dominantBottom.type} and explore a different bottom silhouette.`,
        bonus: `Experiment with a structured or relaxed cut you rarely wear.`,
        blockedValue: memory.dominantBottom.type,
        reasoning: "Fallback generated based on bottom stagnation.",
        confidenceScore: 0.5,
      };

    case "footwear":
      return {
        focusArea: "footwear",
        primary: `Avoid your usual ${memory.dominantFootwear.type}. Choose a different footwear category this week.`,
        bonus: `Try elevating one outfit with a more formal shoe option.`,
        blockedValue: memory.dominantFootwear.type,
        reasoning: "Fallback generated based on footwear stagnation.",
        confidenceScore: 0.5,
      };

    case "layering":
      return {
        focusArea: "layering",
        primary: `Add at least one layered element to your outfits this week.`,
        bonus: `Incorporate a light outerwear piece for structure.`,
        blockedValue: null,
        reasoning: "Fallback generated based on weak layering.",
        confidenceScore: 0.5,
      };

    case "boldness":
      return {
        focusArea: "boldness",
        primary: `Break out of neutral dominance. Introduce at least one bold color this week.`,
        bonus: `Use color contrast intentionally in one outfit.`,
        blockedValue: "neutral",
        reasoning: "Fallback generated based on low boldness.",
        confidenceScore: 0.5,
      };

    case "temperature": {
      const dominantTemp =
        Object.entries(memory.colorBias).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        null;

      return {
        focusArea: "temperature",
        primary: `You lean ${dominantTemp}. This week, experiment with the opposite temperature.`,
        bonus: `Build one outfit clearly anchored in a warm or cool base.`,
        blockedValue: dominantTemp,
        reasoning: "Fallback generated based on temperature bias.",
        confidenceScore: 0.5,
      };
    }

    default:
      return {
        focusArea: "exploration",
        primary: `Try a completely new styling combination this week.`,
        bonus: `Photograph and analyze your most experimental look.`,
        blockedValue: null,
        reasoning: "Fallback generated for exploration.",
        confidenceScore: 0.5,
      };
  }
}

/* ================================
   EXPERIMENTAL ELIGIBILITY
================================ */

async function checkExperimentalEligibility(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("style_challenges")
    .select("primary_status, primary_intensity_level, primary_focus_area")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(4);

  if (!data || data.length < 4) return false;

  const allCompleted = data.every((c) => c.primary_status === "completed");
  const highIntensity = data.every((c) => c.primary_intensity_level >= 3);
  const uniqueFocusAreas = new Set(data.map((c) => c.primary_focus_area));
  const diverseFocus = uniqueFocusAreas.size >= 3;

  return allCompleted && highIntensity && diverseFocus;
}

/* ================================
   INTENSITY SCALING
================================ */

async function calculateNextIntensity(userId: string): Promise<number> {
  const { data } = await supabase
    .from("style_challenges")
    .select("primary_status, primary_intensity_level")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return 2; // default moderate intensity

  if (data.primary_status === "failed") {
    return Math.max(1, (data.primary_intensity_level || 2) - 1);
  }

  if (data.primary_status === "completed") {
    return Math.min(5, (data.primary_intensity_level || 2) + 1);
  }

  return data.primary_intensity_level || 2;
}

function generateExperimentalChallenge(): string {
  return `Build one outfit this week that intentionally breaks your normal pattern. Combine silhouettes or colors you rarely use.`;
}

function calculateTargetFromIntensity(intensity: number): number {
  if (intensity <= 2) return 2;
  if (intensity === 3) return 3;
  if (intensity === 4) return 4;
  return 5;
}

/* ================================
   STEP 5 — CREATE WEEKLY CHALLENGE
================================ */

export async function ensureWeeklyStyleChallenge(userId: string) {
  console.log(`[Weekly Challenge] ensureWeeklyStyleChallenge started for ${userId}`);
  // NOTE: getStartOfWeek() must always return a UTC-normalised date.
  // If it ever returns local time, week boundary comparisons against the DB
  // (timestamptz column) will silently match the wrong rows for non-UTC users.
  const weekStartDate = getStartOfWeek();
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const weekStart = weekStartDate.toISOString();
  const weekEnd = weekEndDate.toISOString();

  // ── 1. Prevent duplicates (application-level check) ──────────────────────
  // A UNIQUE(user_id, week_start) constraint must also exist at the DB level
  // to guard against race conditions when this function is called concurrently.
  const { data: existing } = await supabase
    .from("style_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existing) {
    console.log('[Weekly Challenge] Existing challenge found:', existing);
    return existing;
  }

  // ── 2. Close the previous active challenge if the week has rolled over ────
  const { data: previous } = await supabase
    .from("style_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("primary_status", "active")
    .lt("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previous) {
    const shouldMarkPrimaryCompleted =
      (previous.progress || 0) >= (previous.target || 2);

    // FIX 2 — Evaluate bonus independently from primary.
    // Previously both were set to the same value, incorrectly marking the
    // bonus as completed even when the user never finished it.
    const bonusResolved =
      previous.bonus_status === "completed" ? "completed" : "failed";

    const { error: closeError } = await supabase
      .from("style_challenges")
      .update({
        primary_status: shouldMarkPrimaryCompleted ? "completed" : "failed",
        bonus_status: bonusResolved,
      })
      .eq("id", previous.id);

    // FIX 3 — If closing the previous challenge fails, abort entirely.
    // Continuing here would leave two rows with primary_status = "active"
    // for the same user, corrupting downstream queries.
    if (closeError) {
      console.error(
        "Failed to close previous challenge — aborting to prevent dual-active state:",
        closeError
      );
      return null;
    }
  }

  // ── 3. Build stylist memory ───────────────────────────────────────────────
  const memory = await generateStylistMemory(userId);
  if (!memory) return null;

  // ── 3.5 Fetch recent challenges for anti-duplication ────────────────────
  const { data: recentChallengesData } = await supabase
    .from("style_challenges")
    .select("primary_focus_area, blocked_value")
    .eq("user_id", userId)
    .lt("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(3);

  const recentChallenges = recentChallengesData || [];

  // ── 4. Calculate intensity and generate challenge ─────────────────────────
  const intensity = await calculateNextIntensity(userId);
  const target = calculateTargetFromIntensity(intensity);

  const diagnosis = detectStagnation(memory);
  const challenge = await generateStyleChallenge(diagnosis, memory, intensity, recentChallenges);

  // ── 5. Check experimental eligibility ────────────────────────────────────
  const experimentalEligible = await checkExperimentalEligibility(userId);
  if (experimentalEligible) {
    challenge.experimental = generateExperimentalChallenge();
  }

  // ── 6. Insert new challenge ───────────────────────────────────────────────
  // If a race condition bypassed the application-level duplicate check above,
  // the DB unique constraint on (user_id, week_start) will reject this insert
  // with error code 23505. We fetch and return the winner row in that case
  // instead of surfacing an error to the caller.
  const { data, error } = await supabase
    .from("style_challenges")
    .insert({
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      primary_challenge: challenge.primary,
      primary_description: challenge.primary,
      primary_focus_area: challenge.focusArea,
      // FIX 4 — Populate the standalone focus_area column that mirrors
      // primary_focus_area. Without this it is always NULL in the DB,
      // breaking any frontend query that reads focus_area directly.
      // If this column is confirmed unused, drop it instead:
      //   ALTER TABLE style_challenges DROP COLUMN focus_area;
      focus_area: challenge.focusArea,
      primary_intensity_level: intensity,
      primary_status: "active",
      bonus_focus_area: challenge.focusArea,
      bonus_description: challenge.bonus,
      bonus_status: "pending",
      blocked_value: challenge.blockedValue || null,
      progress: 0,
      target: target,
      generation_reason:
        challenge.reasoning ||
        `Generated based on ${challenge.focusArea} stagnation detection`,
      ai_confidence_score: challenge.confidenceScore || 1.0,
      baseline_snapshot: null,
    })
    .select()
    .single();

  if (error) {
    // FIX 5 — Handle race condition: if a concurrent call already inserted
    // a row for this week (unique constraint violation = code 23505),
    // fetch and return that winning row instead of returning null.
    if (error.code === "23505") {
      console.warn(
        "Race condition detected on style_challenges insert — fetching existing row."
      );
      const { data: raceWinner } = await supabase
        .from("style_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .maybeSingle();
      return raceWinner;
    }

    console.error("Failed to create weekly challenge:", error);
    return null;
  }

  console.log('[Weekly Challenge] Insert result:', data, 'Error:', error);

  return data;
}