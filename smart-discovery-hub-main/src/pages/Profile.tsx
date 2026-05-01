import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { CATEGORIES, INTERESTS } from "@/lib/constants";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [ints, setInts] = useState<string[]>([]);
  const [budget, setBudget] = useState<[number, number]>([0, 1000]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.display_name || "");
        setCats(data.preferred_categories || []);
        setInts(data.interests || []);
        setBudget([Number(data.budget_min), Number(data.budget_max)]);
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, display_name: name, preferred_categories: cats, interests: ints, budget_min: budget[0], budget_max: budget[1]
    });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Preferences saved!");
  };

  const tog = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <>
      <Helmet><title>Profile - Prodvise</title></Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-6 space-y-4">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
            <div className="space-y-4">
              <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div>
                <Label className="block mb-2">Preferred categories</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => tog(cats, c, setCats)}
                      className={`px-3 py-1 rounded-full border text-sm ${cats.includes(c) ? "bg-accent text-accent-foreground border-accent" : "bg-background"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="block mb-2">Interests</Label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <button key={i} type="button" onClick={() => tog(ints, i, setInts)}
                      className={`px-3 py-1 rounded-full border text-sm ${ints.includes(i) ? "bg-accent text-accent-foreground border-accent" : "bg-background"}`}>{i}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Budget: ${budget[0]} – ${budget[1]}</Label>
                <Slider min={0} max={2000} step={10} value={budget} onValueChange={(v) => setBudget([v[0], v[1]])} className="mt-2" />
              </div>
              <Button className="btn-cta hover:btn-cta" onClick={save} disabled={saving}>Save preferences</Button>
            </div>
          </Card>

          <Card className="p-6 bg-accent/10 border-accent/30">
            <div className="flex gap-3">
              <Sparkles className="h-6 w-6 text-accent shrink-0" />
              <div>
                <h2 className="font-bold mb-1">How recommendations work</h2>
                <p className="text-sm text-muted-foreground">
                  When you're new, we use <b>content-based filtering</b> on your preferred categories, interests, and budget to avoid the cold-start problem.
                  As you click, like, add to cart, and buy, we build a personal taste vector and blend in <b>collaborative filtering</b> ("customers like you also liked…")
                  plus a trending boost. The more you shop, the smarter recommendations get.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
