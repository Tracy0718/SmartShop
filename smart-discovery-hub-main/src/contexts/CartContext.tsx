import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  product_id: string;
  qty: number;
  product: {
    id: string;
    title: string;
    price: number;
    image_url: string;
    stock: number;
    brand: string | null;
  };
}

interface CartContextValue {
  items: CartItem[];
  loading: boolean;
  count: number;
  subtotal: number;
  addToCart: (productId: string, qty?: number) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select("id, product_id, qty, product:products(id,title,price,image_url,stock,brand)")
      .eq("user_id", user.id);
    if (!error && data) setItems(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const addToCart = async (productId: string, qty = 1) => {
    if (!user) { toast.error("Please sign in to add to cart"); return; }
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      await updateQty(productId, existing.qty + qty);
      return;
    }
    const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, qty });
    if (error) toast.error(error.message); else { toast.success("Added to cart"); supabase.from("product_events").insert({ user_id: user.id, product_id: productId, type: "add_to_cart", weight: 1 }); }
    await refresh();
  };

  const updateQty = async (productId: string, qty: number) => {
    if (!user) return;
    if (qty <= 0) { await removeFromCart(productId); return; }
    await supabase.from("cart_items").update({ qty }).eq("user_id", user.id).eq("product_id", productId);
    await refresh();
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
    await refresh();
  };

  const clearCart = async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    await refresh();
  };

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * Number(i.product?.price || 0), 0);

  return (
    <CartContext.Provider value={{ items, loading, count, subtotal, addToCart, updateQty, removeFromCart, clearCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}
