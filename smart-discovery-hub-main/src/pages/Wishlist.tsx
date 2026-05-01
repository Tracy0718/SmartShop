import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { ProductCard } from "@/components/ProductCard";

export default function Wishlist() {
  const { user } = useAuth();
  const { ids } = useWishlist();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!user || ids.size === 0) { setProducts([]); return; }
    supabase.from("products").select("*").in("id", Array.from(ids)).then(({ data }) => setProducts(data || []));
  }, [user, ids]);

  return (
    <>
      <Helmet><title>Wishlist - Prodvise</title></Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4">
          <div className="bg-card rounded shadow-sm p-4">
            <h1 className="text-2xl font-bold mb-4">Your Wishlist ({products.length})</h1>
            {products.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">Your wishlist is empty.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
