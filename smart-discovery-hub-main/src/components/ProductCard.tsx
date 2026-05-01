import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { trackEvent } from "@/lib/events";
import type { RecommendedProduct } from "@/lib/recommendations";

export function ProductCard({ product }: { product: RecommendedProduct }) {
  const { isWishlisted, toggle } = useWishlist();
  const { addToCart } = useCart();
  const wished = isWishlisted(product.id);

  return (
    <div className="product-card group relative flex flex-col p-3 h-full">
      <button
        onClick={(e) => { e.preventDefault(); toggle(product.id); }}
        className="absolute top-2 right-2 z-10 bg-background/90 hover:bg-background rounded-full p-1.5 shadow"
        aria-label="Wishlist"
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
      </button>
      <Link
        to={`/product/${product.id}`}
        onClick={() => trackEvent("click", { product_id: product.id })}
        className="block"
      >
        <div className="aspect-square bg-secondary rounded overflow-hidden mb-2">
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{product.brand}</p>
        <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem] hover:text-accent transition-colors">
          {product.title}
        </h3>
        <div className="flex items-center gap-1 text-xs mt-1">
          <span className="star-rating">{"★".repeat(Math.round(product.rating))}<span className="text-muted-foreground">{"★".repeat(5 - Math.round(product.rating))}</span></span>
          <span className="text-muted-foreground">({product.rating_count ?? 0})</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-xs text-muted-foreground">$</span>
          <span className="price-tag text-lg">{Number(product.price).toFixed(2)}</span>
        </div>
        {product.is_trending && (
          <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">
            🔥 Trending
          </span>
        )}
      </Link>
      <div className="mt-auto pt-2">
        <Button
          size="sm"
          className="w-full btn-cta hover:btn-cta text-xs h-8"
          onClick={() => addToCart(product.id)}
        >
          Add to cart
        </Button>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card p-3 flex flex-col">
      <Skeleton className="aspect-square w-full mb-2" />
      <Skeleton className="h-3 w-16 mb-1" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}
