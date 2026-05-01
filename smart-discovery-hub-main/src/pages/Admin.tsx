import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

interface ProductForm {
  id?: string; title: string; description: string; category: string; subcategory: string;
  brand: string; price: number; stock: number; image_url: string; tags: string; is_trending: boolean;
}

const empty: ProductForm = { title: "", description: "", category: "Electronics", subcategory: "", brand: "", price: 0, stock: 100, image_url: "", tags: "", is_trending: false };

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(empty);

  const refresh = () => supabase.from("products").select("*").order("created_at", { ascending: false }).limit(300).then(({ data }) => setProducts(data || []));
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    const payload: any = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    delete payload.id;
    if (form.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", form.id);
      if (error) toast.error(error.message); else { toast.success("Updated"); setOpen(false); refresh(); }
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error(error.message); else { toast.success("Created"); setOpen(false); refresh(); }
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <>
      <Helmet><title>Admin - Prodvise</title></Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Admin · Products ({products.length})</h1>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button onClick={() => setForm(empty)} className="btn-cta hover:btn-cta"><Plus className="h-4 w-4 mr-1" />New product</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} product</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div><Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Subcategory</Label><Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} /></div>
                  <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                  <div><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                  <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
                  <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
                  <label className="col-span-2 flex items-center gap-2"><Switch checked={form.is_trending} onCheckedChange={(v) => setForm({ ...form, is_trending: v })} /> Trending</label>
                </div>
                <Button onClick={save} className="btn-cta hover:btn-cta">{form.id ? "Update" : "Create"}</Button>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary"><tr>
                <th className="text-left p-2">Image</th><th className="text-left p-2">Title</th>
                <th className="text-left p-2">Category</th><th className="text-left p-2">Price</th>
                <th className="text-left p-2">Stock</th><th className="text-left p-2">Trending</th>
                <th className="text-right p-2">Actions</th>
              </tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2"><img src={p.image_url} alt="" className="w-12 h-12 object-cover rounded" /></td>
                    <td className="p-2 max-w-xs truncate">{p.title}</td>
                    <td className="p-2 text-xs">{p.category}</td>
                    <td className="p-2 price-tag">${Number(p.price).toFixed(2)}</td>
                    <td className="p-2">{p.stock}</td>
                    <td className="p-2">{p.is_trending ? "🔥" : ""}</td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setForm({ ...p, tags: (p.tags || []).join(", ") }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
