import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ProductRow } from "@/components/ProductRow";
import { getTopPicks, getTrending, RecommendedProduct } from "@/lib/recommendations";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { CATEGORIES } from "@/lib/constants";

export default function Home() {
  const { user } = useAuth();
  const [top, setTop] = useState<RecommendedProduct[]>([]);
  const [trending, setTrending] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTopPicks(12), getTrending(12)]).then(([t, tr]) => {
      setTop(t); setTrending(tr); setLoading(false);
    });
  }, [user?.id]);

  return (
    <>
      <Helmet>
        <title>Prodvise - Personalized Recommendations</title>
        <meta name="description" content="Discover personalized product recommendations powered by AI. Shop electronics, fashion, home goods, beauty, and more." />
      </Helmet>
      <div className="bg-secondary min-h-screen">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4">
          {/* Hero */}
          <div className="rounded-lg overflow-hidden mb-6 relative" style={{ background: "var(--gradient-hero)" }}>
            <div className="px-6 md:px-12 py-10 md:py-16 text-primary-foreground max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-bold mb-3">
                Smarter shopping, <span className="text-accent">personalized for you</span>
              </h1>
              <p className="text-lg opacity-90 mb-5">
                AI-powered recommendations that learn what you love. Browse 180+ products across 8 categories.
              </p>
              <Link to="/category/Electronics" className="inline-block btn-accent-orange hover:btn-accent-orange px-6 py-3 rounded font-semibold">
                Start shopping
              </Link>
            </div>
          </div>

          {/* Category tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {CATEGORIES.map((c) => (
              <Link key={c} to={`/category/${encodeURIComponent(c)}`}
                className="bg-card rounded shadow-sm p-3 text-center hover:shadow-md transition text-sm font-medium hover:text-accent">
                {c}
              </Link>
            ))}
          </div>

          <ProductRow
            title={user ? "Top Picks for You" : "Featured Products"}
            subtitle={user ? "Personalized using your preferences and behavior" : "Sign in for personalized recommendations"}
            products={top}
            loading={loading}
          />
          <ProductRow title="🔥 Trending Now" subtitle="What everyone's buying this week" products={trending} loading={loading} />
        </div>
      </div>
    </>
  );
}
