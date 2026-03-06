import { supabase } from "./supabase";
import type { StyleMetrics } from "./styleChallengeEngine";

export async function evaluateWeeklyChallenge(
  userId: string,
  styleMetrics: StyleMetrics
) {
  console.log(`[Weekly Challenge Progress] Evaluating metrics for ${userId}`, styleMetrics);

  const { data: active } = await supabase
    .from("style_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("primary_status", "active")
    .maybeSingle();

  console.log(`[Weekly Challenge Progress] Fetched active challenge:`, active);

  if (!active || active.primary_status !== "active") {
    console.log(`[Weekly Challenge Progress] No active challenge found`);
    return;
  }

  let completed = false;

  switch (active.focus_area) {
    case "bottom":
      if (
        active.blocked_value &&
        styleMetrics.bottomType !== active.blocked_value
      ) {
        completed = true;
      }
      break;

    case "footwear":
      if (
        active.blocked_value &&
        styleMetrics.footwearType !== active.blocked_value
      ) {
        completed = true;
      }
      break;

    case "layering":
      if (styleMetrics.layeringLevel !== "single") {
        completed = true;
      }
      break;

    case "boldness":
      if (styleMetrics.colorTemperature !== "neutral") {
        completed = true;
      }
      break;

    case "temperature":
      if (
        active.blocked_value &&
        styleMetrics.colorTemperature !== active.blocked_value
      ) {
        completed = true;
      }
      break;

    case "exploration":
      // Exploration challenges: any outfit upload counts as progress
      completed = true;
      break;

    default:
      // Unknown focus_area — treat as exploration to be safe
      console.warn(`[Weekly Challenge Progress] Unknown focus_area: ${active.focus_area}, treating as exploration`);
      completed = true;
      break;
  }

  console.log(`[Weekly Challenge Progress] Challenge completed logic result: ${completed}`);

  if (!completed) return;

  // Prevent rapid duplicate counting
  const { data: recentOutfits } = await supabase
    .from("OutfitData")
    .select("style_metrics, created_at")
    .eq("user_id", userId)
    .gte("created_at", active.week_start)
    .order("created_at", { ascending: false })
    .limit(5);

  // Skip the first outfit (index 0) — it's the one we JUST inserted,
  // so it will always match the current styleMetrics (false positive).
  const previousOutfits = recentOutfits?.slice(1) || [];

  const isDuplicate = previousOutfits.some(outfit => {
    const previousMetrics = outfit.style_metrics;
    return (
      previousMetrics?.bottomType === styleMetrics.bottomType &&
      previousMetrics?.footwearType === styleMetrics.footwearType &&
      previousMetrics?.colorTemperature === styleMetrics.colorTemperature
    );
  });

  // If duplicate within same week, do not increment progress
  if (isDuplicate) {
    console.log(`[Weekly Challenge Progress] Duplicate outfit detected, not progressing`);
    return;
  }

  const newProgress = (active.progress || 0) + 1;
  console.log(`[Weekly Challenge Progress] Updating progress to ${newProgress}`);

  if (newProgress >= active.target) {
    await supabase
      .from("style_challenges")
      .update({
        progress: newProgress,
        primary_status: "completed"
      })
      .eq("id", active.id);
    console.log(`[Weekly Challenge Progress] Marked challenge as completed`);
  } else {
    await supabase
      .from("style_challenges")
      .update({
        progress: newProgress
      })
      .eq("id", active.id);
  }
}