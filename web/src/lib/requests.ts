import { getSupabaseAdmin } from "@/lib/supabase";

export async function createRequest(prompt: string, source: "human_ui" | "external_agent") {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("requests")
    .insert({
      prompt,
      source,
      status: "NEW"
    })
    .select("id, classification, price_usdc, status")
    .single();

  if (error) throw error;
  return data;
}
