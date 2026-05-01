import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { trackEvent } from "@/lib/events";
import { getSimilar, getAlsoViewed, RecommendedProduct } from "@/lib/recommendations";
import { ProductRow } from "@/components/ProductRow";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<RecommendedProduct[]>([]);
  const [alsoViewed, setAlsoViewed] = useState<RecommendedProduct[]>([]);
  const { addToCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from("products").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setProduct(data); setLoading(false);
      if (data) trackEvent("view", { product_id: data.id });
    });
    Promise.all([getSimilar(id, 6), getAlsoViewed(id, 6)]).then(([s, a]) => {
      setSimilar(s); setAlsoViewed(a);
    });
  }, [id]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (!product) return <div className="p-8 text-center">Product not found.</div>;

  const wished = isWishlisted(product.id);

  return (
    <>
      <Helmet><title>{product.title} - Prodvise</title><meta name="description" content={product.description} /></Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4">
          <div className="bg-card rounded shadow-sm p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-secondary rounded overflow-hidden">
              <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground uppercase">{product.brand} · {product.category}</p>
              <h1 className="text-2xl md:text-3xl font-bold">{product.title}</h1>
              <div className="flex items-center gap-2 text-sm">
                <span className="star-rating">{"★".repeat(Math.round(product.rating))}<span className="text-muted-foreground">{"★".repeat(5 - Math.round(product.rating))}</span></span>
                <span className="text-muted-foreground">({product.rating_count} ratings)</span>
              </div>
              <div className="border-t border-b py-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">$</span>
                  <span className="price-tag text-4xl">{Number(product.price).toFixed(2)}</span>
                </div>
                <p className={`text-sm mt-1 ${product.stock > 0 ? "text-green-700" : "text-destructive"}`}>
                  {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
                </p>
              </div>
              <p className="text-sm leading-relaxed">{product.description}</p>
              <div className="flex flex-wrap gap-1">
                {(product.tags || []).slice(0, 6).map((t: string) => (
                  <span key={t} className="text-xs bg-secondary px-2 py-1 rounded">{t}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="lg" className="btn-cta hover:btn-cta flex-1" onClick={() => addToCart(product.id)} disabled={product.stock === 0}>
                  <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
                </Button>
                <Button size="lg" variant="outline" onClick={() => toggle(product.id)}>
                  <Heart className={`h-5 w-5 ${wished ? "fill-destructive text-destructive" : ""}`} />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <ProductRow title="Customers also viewed" subtitle="Collaborative recommendations" products={alsoViewed} cols={6} />
            <ProductRow title="Similar items" subtitle="Content-based recommendations" products={similar} cols={6} />
          </div>
        </div>
      </div>
    </>
  );
}
