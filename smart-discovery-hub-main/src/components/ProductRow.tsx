import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import type { RecommendedProduct } from "@/lib/recommendations";

interface Props {
  title: string;
  subtitle?: string;
  products: RecommendedProduct[];
  loading?: boolean;
  cols?: number;
}

export function ProductRow({ title, subtitle, products, loading, cols = 6 }: Props) {
  return (
    <section className="bg-card rounded shadow-sm p-4 mb-6">
      <div className="mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-${cols} gap-3`}>
        {loading
          ? Array.from({ length: cols }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {!loading && products.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">No products to show yet.</p>
      )}
    </section>
  );
}
