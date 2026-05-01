import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*, order_items(*, product:products(title,image_url))").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders(data || []));
  }, [user]);

  return (
    <>
      <Helmet><title>Orders - Prodvise</title></Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-5xl mx-auto px-3 md:px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
          {orders.length === 0 ? <p className="text-muted-foreground">No orders yet.</p> : orders.map((o) => (
            <Card key={o.id} className="mb-3 p-4">
              <div className="flex justify-between text-sm mb-2">
                <div><div className="text-xs text-muted-foreground">Order</div><code>{o.id.slice(0, 8)}</code></div>
                <div><div className="text-xs text-muted-foreground">Date</div>{new Date(o.created_at).toLocaleDateString()}</div>
                <div><div className="text-xs text-muted-foreground">Total</div><span className="price-tag">${Number(o.total).toFixed(2)}</span></div>
                <div><div className="text-xs text-muted-foreground">Status</div><span className="capitalize">{o.status}</span></div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {o.order_items?.map((it: any) => (
                  <div key={it.id} className="flex items-center gap-2 text-xs bg-secondary px-2 py-1 rounded">
                    <img src={it.product?.image_url} alt="" className="w-8 h-8 object-cover rounded" />
                    <span>{it.product?.title} × {it.qty}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
