import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, ShoppingCart, Heart, User as UserIcon, LogOut, ShieldCheck, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORIES } from "@/lib/constants";
import { trackEvent } from "@/lib/events";

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    trackEvent("search", { query: q.trim() });
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow">
      <div className="flex items-center gap-2 px-3 md:px-6 py-2">
        <Link to="/" className="flex items-center gap-1 font-bold text-xl shrink-0 px-2 py-1 rounded hover:bg-primary-foreground/10 border border-transparent hover:border-primary-foreground/30 transition">
          <span className="text-accent">Prod</span>vise
        </Link>

        <form onSubmit={submit} className="flex-1 hidden sm:flex max-w-3xl mx-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, brands, categories…"
            className="rounded-r-none bg-background text-foreground border-0 focus-visible:ring-2 focus-visible:ring-accent"
          />
          <Button type="submit" className="rounded-l-none btn-accent-orange hover:btn-accent-orange px-4">
            <Search className="h-5 w-5" />
          </Button>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground gap-2 hidden md:flex">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-xs">Hi, {user.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}><UserIcon className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/orders")}><Package className="mr-2 h-4 w-4" />Orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/wishlist")}><Heart className="mr-2 h-4 w-4" />Wishlist</DropdownMenuItem>
                {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}><ShieldCheck className="mr-2 h-4 w-4" />Admin</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Sign in
            </Button>
          )}

          <Button variant="ghost" onClick={() => navigate("/wishlist")} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground hidden md:inline-flex">
            <Heart className="h-5 w-5" />
          </Button>

          <Button variant="ghost" onClick={() => navigate("/cart")} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground relative">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {count}
              </span>
            )}
            <span className="ml-1 hidden md:inline">Cart</span>
          </Button>
        </div>
      </div>

      {/* Category strip */}
      <div className="bg-primary-glow border-t border-primary-foreground/10 overflow-x-auto">
        <div className="flex items-center gap-1 px-3 md:px-6 py-1 text-sm">
          {CATEGORIES.map((c) => (
            <Link key={c} to={`/category/${encodeURIComponent(c)}`}
              className="whitespace-nowrap px-3 py-1 rounded hover:bg-primary-foreground/10 border border-transparent hover:border-primary-foreground/30 transition">
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile search */}
      <form onSubmit={submit} className="flex sm:hidden p-2 bg-primary-glow">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="rounded-r-none bg-background text-foreground"
        />
        <Button type="submit" className="rounded-l-none btn-accent-orange">
          <Search className="h-4 w-4" />
        </Button>
      </form>
    </header>
  );
}
