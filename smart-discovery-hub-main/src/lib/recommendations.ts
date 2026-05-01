import { supabase } from "@/integrations/supabase/client";

export interface RecommendedProduct {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  price: number;
  rating: number;
  rating_count?: number;
  is_trending?: boolean;
  tags: string[];
  image_url: string;
}

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommendations`;

async function fetchRecs(params: Record<string, string>): Promise<RecommendedProduct[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  const url = `${FN_BASE}?${new URLSearchParams(params)}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.items || [];
}

export const getTopPicks = (limit = 12) => fetchRecs({ mode: "top_picks", limit: String(limit) });
export const getTrending = (limit = 12) => fetchRecs({ mode: "trending", limit: String(limit) });
export const getSimilar = (productId: string, limit = 8) =>
  fetchRecs({ mode: "similar", product_id: productId, limit: String(limit) });
export const getAlsoViewed = (productId: string, limit = 8) =>
  fetchRecs({ mode: "also_viewed", product_id: productId, limit: String(limit) });
