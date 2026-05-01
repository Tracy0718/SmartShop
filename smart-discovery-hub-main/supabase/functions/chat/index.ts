// Streaming AI shopping assistant grounded in catalog + user context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    const lastUser = [...(messages || [])].reverse().find((m: any) => m.role === "user")?.content || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, serviceKey);

    // Identify user
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const ac = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await ac.auth.getUser();
      userId = data.user?.id ?? null;
    }

    // Simple keyword filter to keep prompt small
    const q = lastUser.toLowerCase();
    const tokens = q.split(/[^a-z0-9]+/).filter((t: string) => t.length > 2);

    let { data: products } = await supa
      .from("products")
      .select("id,title,category,subcategory,brand,price,rating,tags")
      .limit(800);
    products = products || [];
    let candidates = products;
    if (tokens.length) {
      candidates = products
        .map((p) => {
          const hay = `${p.title} ${p.category} ${p.subcategory ?? ""} ${p.brand ?? ""} ${(p.tags || []).join(" ")}`.toLowerCase();
          let score = 0;
          for (const t of tokens) if (hay.includes(t)) score++;
          return { p, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30)
        .map((x) => x.p);
      if (candidates.length < 8) {
        candidates = products
          .sort((a, b) => Number(b.rating) - Number(a.rating))
          .slice(0, 20);
      }
    } else {
      candidates = products.sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 20);
    }

    let profileText = "";
    if (userId) {
      const { data: profile } = await supa
        .from("profiles")
        .select("display_name,preferred_categories,interests,budget_min,budget_max")
        .eq("id", userId).maybeSingle();
      if (profile) {
        profileText = `User profile: name=${profile.display_name ?? "user"}, preferred=[${(profile.preferred_categories || []).join(", ")}], interests=[${(profile.interests || []).join(", ")}], budget=$${profile.budget_min}-$${profile.budget_max}.`;
      }
    }

    const catalogLines = candidates
      .map((p) => `- [${p.id}] ${p.title} | ${p.category}${p.subcategory ? "/" + p.subcategory : ""} | ${p.brand ?? ""} | $${Number(p.price).toFixed(2)} | rating ${p.rating}`)
      .join("\n");

    const systemPrompt = `You are ShopBot, a friendly AI shopping assistant for an Amazon-style store.
${profileText}

Relevant catalog (use ONLY these products, do not invent):
${catalogLines}

Rules:
- Recommend 1-5 products from the catalog. Briefly explain why each fits the user's question.
- Reference products as Markdown links: [Product Title](/product/PRODUCT_ID).
- Keep tone helpful, concise, and friendly. Use short bullet points.
- If nothing matches, say so honestly and suggest a different search.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...(messages || [])],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat err", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
