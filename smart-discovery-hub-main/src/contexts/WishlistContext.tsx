import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface WishlistContextValue {
  ids: Set<string>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) { setIds(new Set()); return; }
    const { data } = await supabase.from("wishlist").select("product_id").eq("user_id", user.id);
    setIds(new Set((data || []).map(d => d.product_id)));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (productId: string) => {
    if (!user) { toast.error("Sign in to use wishlist"); return; }
    if (ids.has(productId)) {
      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlist").insert({ user_id: user.id, product_id: productId });
      await supabase.from("product_events").insert({ user_id: user.id, product_id: productId, type: "like", weight: 1 });
      toast.success("Added to wishlist");
    }
    await refresh();
  };

  return (
    <WishlistContext.Provider value={{ ids, toggle, isWishlisted: (id) => ids.has(id), refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist outside WishlistProvider");
  return ctx;
}
