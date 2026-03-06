import { supabase } from "./supabase";

export const getLast7StyleMetrics = async (userId: string) => {
  const { data, error } = await supabase
    .from("OutfitData")
    .select("style_metrics")
    .eq("user_id", userId)
    .not("style_metrics", "is", null)
    .order("created_at", { ascending: false })
    .limit(7);

  if (error) throw error;

  return data?.map(d => d.style_metrics) || [];
};