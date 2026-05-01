import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/events";

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [addr, setAddr] = useState({ name: "", line1: "", city: "", zip: "", country: "USA" });
  const [payment, setPayment] = useState("card");
  const [card, setCard] = useState({ number: "", exp: "", cvv: "" });

  const tax = subtotal * 0.08;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + tax + shipping;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!addr.name || !addr.line1 || !addr.city || !addr.zip) { toast.error("Please complete shipping address"); return; }
    if (payment === "card") {
      const num = card.number.replace(/\s/g, "");
      if (num.length < 13 || !/^\d+$/.test(num)) { toast.error("Invalid card number"); return; }
      if (!/^\d{2}\/\d{2}$/.test(card.exp)) { toast.error("Invalid expiry (MM/YY)"); return; }
      if (!/^\d{3,4}$/.test(card.cvv)) { toast.error("Invalid CVV"); return; }
    }
    setLoading(true);
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id, total, shipping_address: addr, payment_method: payment, status: "paid"
    }).select().single();
    if (error || !order) { toast.error(error?.message || "Order failed"); setLoading(false); return; }
    const orderItems = items.map((i) => ({ order_id: order.id, product_id: i.product_id, qty: i.qty, unit_price: Number(i.product.price) }));
    await supabase.from("order_items").insert(orderItems);
    for (const i of items) await trackEvent("purchase", { product_id: i.product_id, weight: i.qty });
    await clearCart();
    setSuccess(order.id);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <CheckCircle2 className="h-16 w-16 text-success mb-4" />
        <h1 className="text-3xl font-bold mb-2">Order placed!</h1>
        <p className="text-muted-foreground mb-2">Order ID: <code className="bg-secondary px-2 py-1 rounded">{success.slice(0, 8)}</code></p>
        <p className="text-sm text-muted-foreground mb-6">A confirmation has been recorded. Thank you for shopping with Prodvise.</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/orders")}>View orders</Button>
          <Button variant="outline" onClick={() => navigate("/")}>Continue shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Checkout - Prodvise</title></Helmet>
      <div className="bg-secondary min-h-screen">
        <form onSubmit={placeOrder} className="max-w-5xl mx-auto px-3 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="font-bold mb-3">Shipping address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2"><Label>Full name</Label><Input value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} required /></div>
                <div className="md:col-span-2"><Label>Address</Label><Input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} required /></div>
                <div><Label>City</Label><Input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} required /></div>
                <div><Label>ZIP</Label><Input value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} required /></div>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="font-bold mb-3">Payment method</h2>
              <RadioGroup value={payment} onValueChange={setPayment} className="space-y-2">
                <label className="flex items-center gap-2 p-2 border rounded cursor-pointer"><RadioGroupItem value="card" /> Credit / Debit Card</label>
                <label className="flex items-center gap-2 p-2 border rounded cursor-pointer"><RadioGroupItem value="cod" /> Cash on Delivery</label>
              </RadioGroup>
              {payment === "card" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="md:col-span-2"><Label>Card number</Label><Input placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} /></div>
                  <div><Label>Expiry (MM/YY)</Label><Input placeholder="12/28" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></div>
                  <div><Label>CVV</Label><Input placeholder="123" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">⚠️ Simulated payment — no real charge is made.</p>
            </Card>
          </div>
          <Card className="p-4 h-fit lg:sticky lg:top-32">
            <h2 className="font-bold mb-3">Order summary</h2>
            <div className="text-sm space-y-1">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between gap-2">
                  <span className="truncate">{i.product?.title} × {i.qty}</span>
                  <span>${(Number(i.product?.price) * i.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t mt-2 pt-2 flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold"><span>Total</span><span className="price-tag text-lg">${total.toFixed(2)}</span></div>
            </div>
            <Button type="submit" className="w-full mt-4 btn-cta hover:btn-cta" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Place order
            </Button>
          </Card>
        </form>
      </div>
    </>
  );
}
