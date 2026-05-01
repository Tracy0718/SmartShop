import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RecommendedProduct } from "@/lib/recommendations";

interface Props { mode: "category" | "search"; }

export default function Listing({ mode }: Props) {
  const { name } = useParams();
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const [all, setAll] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<[number, number]>([0, 2000]);
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [sort, setSort] = useState("relevance");

  useEffect(() => {
    setLoading(true);
    let query = supabase.from("products").select("*").limit(500);
    if (mode === "category" && name) query = query.eq("category", decodeURIComponent(name));
    query.then(({ data }) => {
      let items = (data || []) as RecommendedProduct[];
      if (mode === "search" && q) {
        // Strict relevance scoring: title/subcategory matches rank highest;
        // category/brand/tag matches only count if they actually relate to the query.
        // Items that only loosely match (e.g. tag overlap with no title match) are dropped.
        const singularize = (w: string) => w.replace(/(ies)$/i, "y").replace(/(es|s)$/i, "");
        const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2).map(singularize);
        if (tokens.length) {
          const scored = items.map((p) => {
            const title = p.title.toLowerCase();
            const sub = (p.subcategory ?? "").toLowerCase();
            const cat = p.category.toLowerCase();
            const brand = (p.brand ?? "").toLowerCase();
            const tags = (p.tags || []).map((t) => t.toLowerCase());
            let score = 0;
            let strongHits = 0;
            for (const t of tokens) {
              const inTitle = title.includes(t);
              const inSub = sub.includes(t);
              const inCat = cat.includes(t);
              const inBrand = brand.includes(t);
              const inTags = tags.some((tg) => tg === t || tg.includes(t));
              if (inTitle) { score += 10; strongHits++; }
              else if (inSub) { score += 6; strongHits++; }
              else if (inCat) { score += 3; }
              else if (inBrand) { score += 4; strongHits++; }
              else if (inTags) { score += 2; }
            }
            return { p, score, strongHits };
          });
          // Require at least one STRONG hit (title/subcategory/brand) — drops loose tag matches.
          items = scored
            .filter((x) => x.strongHits > 0 && x.score >= 6)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.p);
        }
      }
      setAll(items);
      setLoading(false);
    });
  }, [mode, name, q]);

  const allBrands = useMemo(() => Array.from(new Set(all.map((p) => p.brand).filter(Boolean) as string[])).sort(), [all]);

  const filtered = useMemo(() => {
    let r = all.filter((p) => Number(p.price) >= price[0] && Number(p.price) <= price[1]);
    if (minRating) r = r.filter((p) => Number(p.rating) >= minRating);
    if (inStock) r = r.filter((p) => (p as any).stock > 0);
    if (brands.length) r = r.filter((p) => p.brand && brands.includes(p.brand));
    if (sort === "price_asc") r = [...r].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "price_desc") r = [...r].sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === "rating") r = [...r].sort((a, b) => Number(b.rating) - Number(a.rating));
    return r;
  }, [all, price, minRating, inStock, brands, sort]);

  const title = mode === "category" ? decodeURIComponent(name || "") : `Search: ${q}`;

  return (
    <>
      <Helmet><title>{title} - Prodvise</title></Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <aside className="bg-card rounded p-4 h-fit space-y-5 shadow-sm">
            <h3 className="font-bold">Filters</h3>
            <div>
              <Label className="text-sm">Price: ${price[0]} – ${price[1]}</Label>
              <Slider min={0} max={2000} step={10} value={price} onValueChange={(v) => setPrice([v[0], v[1]])} className="mt-2" />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Min rating</Label>
              {[4, 3, 0].map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <input type="radio" checked={minRating === r} onChange={() => setMinRating(r)} />
                  {r === 0 ? "Any" : `${r}★ & up`}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="in-stock" checked={inStock} onCheckedChange={(v) => setInStock(!!v)} />
              <Label htmlFor="in-stock" className="text-sm cursor-pointer">In stock only</Label>
            </div>
            {allBrands.length > 0 && (
              <div>
                <Label className="text-sm mb-2 block">Brand</Label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allBrands.map((b) => (
                    <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={brands.includes(b)} onCheckedChange={(v) => setBrands(v ? [...brands, b] : brands.filter((x) => x !== b))} />
                      {b}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div>
            <div className="bg-card rounded p-3 mb-4 flex items-center justify-between shadow-sm">
              <h1 className="text-lg font-bold">{title} <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span></h1>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price_asc">Price: low to high</SelectItem>
                  <SelectItem value="price_desc">Price: high to low</SelectItem>
                  <SelectItem value="rating">Highest rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {!loading && filtered.length === 0 && (
              <div className="bg-card rounded p-8 text-center text-muted-foreground">No products match your filters.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
