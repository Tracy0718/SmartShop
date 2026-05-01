import { supabase } from "@/integrations/supabase/client";

export type EventType = "view" | "click" | "like" | "search" | "add_to_cart" | "purchase";

export async function trackEvent(type: EventType, opts: { product_id?: string; query?: string; weight?: number } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("product_events").insert({
    user_id: user.id,
    product_id: opts.product_id ?? null,
    type,
    query: opts.query ?? null,
    weight: opts.weight ?? 1,
  });
}
