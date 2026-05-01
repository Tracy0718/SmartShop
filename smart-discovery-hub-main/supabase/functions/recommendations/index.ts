// Hybrid recommendation engine: content-based (cold start) + behavior + collaborative + trending.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Product {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  price: number;
  rating: number;
  rating_count: number;
  is_trending: boolean;
  tags: string[];
  image_url: string;
}

const EVENT_WEIGHTS: Record<string, number> = {
  view: 0.5,
  click: 1,
  search: 1,
  like: 3,
  add_to_cart: 4,
  purchase: 5,
};

function buildVocab(products: Product[]) {
  const set = new Set<string>();
  for (const p of products) {
    set.add(`cat:${p.category.toLowerCase()}`);
    if (p.subcategory) set.add(`sub:${p.subcategory.toLowerCase()}`);
    if (p.brand) set.add(`brand:${p.brand.toLowerCase()}`);
    for (const t of p.tags || []) set.add(`tag:${t.toLowerCase()}`);
  }
  return Array.from(set);
}

function productVector(p: Product, vocabIndex: Map<string, number>) {
  const v = new Array(vocabIndex.size).fill(0);
  const setIdx = (k: string, w: number) => {
    const i = vocabIndex.get(k);
    if (i !== undefined) v[i] = w;
  };
  setIdx(`cat:${p.category.toLowerCase()}`, 2);
  if (p.subcategory) setIdx(`sub:${p.subcategory.toLowerCase()}`, 1.5);
  if (p.brand) setIdx(`brand:${p.brand.toLowerCase()}`, 1);
  for (const t of p.tags || []) setIdx(`tag:${t.toLowerCase()}`, 1);
  return v;
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function budgetBonus(price: number, min: number, max: number) {
  if (price >= min && price <= max) return 0.15;
  const center = (min + max) / 2 || price;
  const dist = Math.abs(price - center) / (center || 1);
  return Math.max(0, 0.15 - dist * 0.3);
}

serve();
function serve() {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      const url = new URL(req.url);
      const mode = url.searchParams.get("mode") || "top_picks"; // top_picks | similar | also_viewed | trending
      const productId = url.searchParams.get("product_id");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "12"), 30);

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supa = createClient(supabaseUrl, serviceKey);

      // identify user (optional)
      const auth = req.headers.get("Authorization");
      let userId: string | null = null;
      if (auth) {
        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: auth } },
        });
        const { data } = await anonClient.auth.getUser();
        userId = data.user?.id ?? null;
      }

      const { data: products } = await supa.from("products").select(
        "id,title,category,subcategory,brand,price,rating,rating_count,is_trending,tags,image_url",
      );
      if (!products?.length) return json({ items: [] });

      const vocab = buildVocab(products);
      const vIdx = new Map(vocab.map((t, i) => [t, i]));
      const vectors = new Map(products.map((p) => [p.id, productVector(p, vIdx)]));

      // Trending scores: products marked trending + last-7d events boost
      const sevenAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: trendEvents } = await supa
        .from("product_events")
        .select("product_id,type,weight")
        .gte("created_at", sevenAgo);
      const trendScore = new Map<string, number>();
      for (const e of trendEvents || []) {
        const w = (EVENT_WEIGHTS[e.type] ?? 1) * Number(e.weight || 1);
        trendScore.set(e.product_id, (trendScore.get(e.product_id) || 0) + w);
      }
      for (const p of products) if (p.is_trending) trendScore.set(p.id, (trendScore.get(p.id) || 0) + 5);

      // Similar (content-based) for given product
      if (mode === "similar" && productId) {
        const baseVec = vectors.get(productId);
        if (!baseVec) return json({ items: [] });
        const ranked = products
          .filter((p) => p.id !== productId)
          .map((p) => ({ p, s: cosine(baseVec, vectors.get(p.id)!) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, limit)
          .map((x) => x.p);
        return json({ items: ranked });
      }

      // Customers also viewed (collaborative co-occurrence) for given product
      if (mode === "also_viewed" && productId) {
        const { data: usersWho } = await supa
          .from("product_events")
          .select("user_id")
          .eq("product_id", productId)
          .in("type", ["view", "click", "like", "add_to_cart", "purchase"]);
        const uids = Array.from(new Set((usersWho || []).map((r) => r.user_id))).slice(0, 200);
        const co = new Map<string, number>();
        if (uids.length) {
          const { data: their } = await supa
            .from("product_events")
            .select("product_id,type")
            .in("user_id", uids)
            .neq("product_id", productId);
          for (const e of their || []) {
            co.set(e.product_id, (co.get(e.product_id) || 0) + (EVENT_WEIGHTS[e.type] ?? 1));
          }
        }
        const items = Array.from(co.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => products.find((p) => p.id === id))
          .filter(Boolean);
        if (items.length < limit) {
          // fallback to similar
          const baseVec = vectors.get(productId);
          if (baseVec) {
            const more = products
              .filter((p) => p.id !== productId && !items.find((i: any) => i.id === p.id))
              .map((p) => ({ p, s: cosine(baseVec, vectors.get(p.id)!) }))
              .sort((a, b) => b.s - a.s)
              .slice(0, limit - items.length)
              .map((x) => x.p);
            items.push(...more);
          }
        }
        return json({ items });
      }

      if (mode === "trending") {
        const ranked = products
          .map((p) => ({ p, s: (trendScore.get(p.id) || 0) + (p.is_trending ? 3 : 0) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, limit)
          .map((x) => x.p);
        return json({ items: ranked });
      }

      // Default: top_picks (hybrid for the user)
      let prefVec: number[] | null = null;
      let behaviorVec: number[] | null = null;
      let priceMin = 0, priceMax = 1e9;
      let eventCount = 0;

      if (userId) {
        const { data: profile } = await supa
          .from("profiles")
          .select("preferred_categories,interests,budget_min,budget_max")
          .eq("id", userId)
          .maybeSingle();
        if (profile) {
          priceMin = Number(profile.budget_min || 0);
          priceMax = Number(profile.budget_max || 1e9);
          prefVec = new Array(vocab.length).fill(0);
          for (const c of profile.preferred_categories || []) {
            const i = vIdx.get(`cat:${(c as string).toLowerCase()}`);
            if (i !== undefined) prefVec[i] = 2;
          }
          for (const t of profile.interests || []) {
            const i = vIdx.get(`tag:${(t as string).toLowerCase()}`);
            if (i !== undefined) prefVec[i] = 1.5;
          }
        }

        const { data: userEvents } = await supa
          .from("product_events")
          .select("product_id,type,weight,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(300);
        eventCount = userEvents?.length || 0;
        if (eventCount) {
          behaviorVec = new Array(vocab.length).fill(0);
          const now = Date.now();
          for (const e of userEvents!) {
            if (!e.product_id) continue;
            const pv = vectors.get(e.product_id);
            if (!pv) continue;
            const ageDays = (now - new Date(e.created_at).getTime()) / 86400000;
            const decay = Math.exp(-ageDays / 14);
            const w = (EVENT_WEIGHTS[e.type] ?? 1) * Number(e.weight || 1) * decay;
            for (let i = 0; i < pv.length; i++) behaviorVec[i] += pv[i] * w;
          }
        }
      }

      // Collaborative scores from user's recent items
      const collab = new Map<string, number>();
      if (userId && eventCount) {
        const { data: myProds } = await supa
          .from("product_events")
          .select("product_id")
          .eq("user_id", userId)
          .not("product_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(20);
        const seedIds = Array.from(new Set((myProds || []).map((r) => r.product_id))).filter(Boolean);
        if (seedIds.length) {
          const { data: peers } = await supa
            .from("product_events")
            .select("user_id")
            .in("product_id", seedIds as string[])
            .neq("user_id", userId);
          const peerIds = Array.from(new Set((peers || []).map((r) => r.user_id))).slice(0, 200);
          if (peerIds.length) {
            const { data: their } = await supa
              .from("product_events")
              .select("product_id,type")
              .in("user_id", peerIds);
            for (const e of their || []) {
              if (!e.product_id || (seedIds as string[]).includes(e.product_id)) continue;
              collab.set(e.product_id, (collab.get(e.product_id) || 0) + (EVENT_WEIGHTS[e.type] ?? 1));
            }
          }
        }
      }
      // normalize collab
      let maxC = 0;
      for (const v of collab.values()) if (v > maxC) maxC = v;
      let maxT = 0;
      for (const v of trendScore.values()) if (v > maxT) maxT = v;

      // Auto-adjust weights: more events → trust collab/behavior more
      const behaviorW = eventCount === 0 ? 0 : Math.min(0.55, 0.25 + eventCount * 0.01);
      const prefW = eventCount === 0 ? 0.7 : Math.max(0.1, 0.4 - eventCount * 0.005);
      const collabW = eventCount === 0 ? 0 : Math.min(0.4, 0.1 + eventCount * 0.008);
      const trendW = 0.15;

      const seenIds = new Set<string>();
      if (userId && eventCount) {
        const { data: seen } = await supa
          .from("product_events")
          .select("product_id")
          .eq("user_id", userId)
          .in("type", ["purchase", "add_to_cart"]);
        for (const r of seen || []) if (r.product_id) seenIds.add(r.product_id);
      }

      const ranked = products
        .filter((p) => !seenIds.has(p.id))
        .map((p) => {
          const pv = vectors.get(p.id)!;
          const sPref = prefVec ? cosine(pv, prefVec) : 0;
          const sBeh = behaviorVec ? cosine(pv, behaviorVec) : 0;
          const sCol = maxC ? (collab.get(p.id) || 0) / maxC : 0;
          const sTr = maxT ? (trendScore.get(p.id) || 0) / maxT : (p.is_trending ? 0.5 : 0);
          const bb = budgetBonus(Number(p.price), priceMin, priceMax);
          const ratingBoost = (Number(p.rating) - 4) * 0.02;
          const score = sPref * prefW + sBeh * behaviorW + sCol * collabW + sTr * trendW + bb + ratingBoost;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((x) => x.p);

      return json({ items: ranked, signals: { eventCount, prefW, behaviorW, collabW, trendW } });
    } catch (e) {
      console.error("recommendations error", e);
      return json({ error: String(e) }, 500);
    }
  });

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
