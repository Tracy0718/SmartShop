import { Helmet } from "react-helmet-async";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus } from "lucide-react";

export default function Cart() {
  const { items, updateQty, removeFromCart, subtotal, count } = useCart();
  const navigate = useNavigate();

  if (count === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-secondary">
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <Link to="/" className="text-accent underline">Continue shopping</Link>
      </div>
    );
  }

  const tax = subtotal * 0.08;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + tax + shipping;

  return (
    <>
      <Helmet><title>Cart - Prodvise</title></Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="bg-card rounded shadow-sm p-4">
            <h1 className="text-2xl font-bold mb-4">Shopping Cart ({count})</h1>
            <div className="divide-y">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 py-4">
                  <Link to={`/product/${it.product_id}`} className="w-24 h-24 bg-secondary rounded overflow-hidden shrink-0">
                    <img src={it.product?.image_url} alt={it.product?.title} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${it.product_id}`} className="font-medium hover:text-accent line-clamp-2">{it.product?.title}</Link>
                    <p className="text-xs text-muted-foreground">{it.product?.brand}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.product_id, it.qty - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm">{it.qty}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.product_id, it.qty + 1)}><Plus className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(it.product_id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="price-tag">${(Number(it.product?.price) * it.qty).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="bg-card rounded shadow-sm p-4 h-fit lg:sticky lg:top-32">
            <h2 className="font-bold mb-3">Order summary</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base"><span>Total</span><span className="price-tag text-lg">${total.toFixed(2)}</span></div>
            </div>
            <Button className="w-full mt-4 btn-cta hover:btn-cta" onClick={() => navigate("/checkout")}>Proceed to Checkout</Button>
          </aside>
        </div>
      </div>
    </>
  );
}
