import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message); else { toast.success("Welcome back!"); navigate("/"); }
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: name || email.split("@")[0] }
      }
    });
    setLoading(false);
    if (error) toast.error(error.message); else { toast.success("Account created! You can set preferences in Profile."); navigate("/profile"); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/` });
    if (r.error) toast.error(String(r.error));
  };

  return (
    <>
      <Helmet><title>Sign in - Prodvise</title></Helmet>
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold text-center mb-1">Prodvise</h1>
          <p className="text-center text-sm text-muted-foreground mb-4">Personalized shopping</p>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Sign up</TabsTrigger></TabsList>
            <TabsContent value="signin" className="space-y-3 pt-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button className="w-full btn-cta hover:btn-cta" disabled={loading} onClick={signIn}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in</Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 pt-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button className="w-full btn-cta hover:btn-cta" disabled={loading} onClick={signUp}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account</Button>
            </TabsContent>
          </Tabs>
          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground"><div className="flex-1 border-t" />OR<div className="flex-1 border-t" /></div>
          <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        </Card>
      </div>
    </>
  );
}
