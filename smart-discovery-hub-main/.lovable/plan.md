
# Personalized Product Recommendation Store (Amazon‑style)

A full-stack shopping app with auth, a 150–200 product catalog, hybrid recommendations (content‑based → collaborative once behavior exists), wishlist, cart, checkout, admin panel, and an AI shopping chatbot.

## Stack note (adapted to Lovable)
- **Frontend:** React + Vite + Tailwind + shadcn/ui (Amazon‑style: white bg, slate/orange accents, dense product cards, sticky navbar with search).
- **Backend:** Lovable Cloud (Postgres + Auth + Storage + Edge Functions) replacing Node/Express + MongoDB. Same REST‑style calls via the Supabase client.
- **AI:** Lovable AI Gateway (Gemini) for the chatbot and to generate product imagery during seeding.
- **State:** React Context (auth, cart, wishlist) + TanStack Query for server data.

## Data model (Postgres tables with RLS)
- `profiles` — name, avatar, preferred_categories[], budget_min, budget_max, interests[].
- `user_roles` — `user` / `admin` (separate table, security‑definer `has_role()`).
- `products` — title, description, category, subcategory, brand, price, rating, rating_count, stock, image_url, tags[], attributes(jsonb), is_trending, created_at.
- `product_events` — user_id, product_id, type (`view`/`click`/`like`/`search`/`add_to_cart`/`purchase`), query (for searches), weight, created_at. Drives personalization.
- `wishlist` — user_id, product_id.
- `cart_items` — user_id, product_id, qty.
- `orders` + `order_items` — checkout history (also feeds collaborative filtering).

RLS: users access only their own rows; products are public read, admin‑only write.

## Catalog (150–200 products)
Seed across 8 categories: Electronics, Fashion (Men/Women), Home & Kitchen, Beauty, Sports & Outdoors, Books, Toys, Grocery. Each product has realistic title, brand, price, rating, stock, tags, and a real image (Unsplash URLs by category, with a fallback to AI‑generated images via the gateway for any missing slots). Trending flag set on ~20 items.

## Pages & UX (Amazon‑style)
1. **Top Nav** — logo, category mega‑menu, big search bar, account, wishlist, cart badge.
2. **Home** — hero strip, "Top Picks for You", "Trending Now", "Because you viewed…", "Recommended in {favorite category}", category tiles.
3. **Listing / Category / Search results** — left sidebar filters (price range, category, brand, min rating, in‑stock), sort (relevance, price, rating, newest), grid of product cards, pagination, skeleton loaders.
4. **Product Detail** — gallery, title, rating, price, stock, add‑to‑cart, add‑to‑wishlist, attributes, "Customers also viewed" (collaborative), "Similar items" (content‑based).
5. **Wishlist** — grid with move‑to‑cart.
6. **Cart** — line items, qty, subtotal, taxes, shipping estimate, "Proceed to checkout".
7. **Checkout / Payment** — address form, payment method selector, order summary, mock card form with validation, success page with order id. Fully responsive. (Real payments not enabled — this will be a simulated checkout that records orders. We can wire Stripe/Paddle later if you want.)
8. **Orders** — past order history.
9. **Profile / Preferences** — edit name, categories, budget, interests (used for cold‑start recs).
10. **Auth** — email/password + Google sign-in, signup captures initial preferences.
11. **Admin Panel** (`/admin`, role‑gated) — products table with create/edit/delete, image upload, trending toggle, bulk import.
12. **AI Chatbot** — floating button, streaming chat that can recommend products, answer "find me running shoes under $80", and link directly to products.

## Hybrid recommendation engine

Implemented as edge functions returning ranked product lists. Scores are blended; weights shift as a user accumulates behavior.

- **Cold start → Content‑based** (new users): score products by similarity between user `preferences/interests/budget` and product `tags + category + price`. Cosine similarity over a tag‑vector + budget proximity bonus.
- **Warm users → Behavior‑based content filtering**: build a user "taste vector" from `product_events` (clicks=1, like=3, add_to_cart=4, purchase=5, decayed by recency). Recommend unseen products with highest cosine similarity to that vector.
- **Existing users → Collaborative filtering**: item‑to‑item co‑occurrence from `order_items` + `product_events` ("users who liked X also liked Y"). Used for "Customers also viewed" and to diversify Top Picks.
- **Hybrid blend** for "Top Picks for You": `final = 0.5·behavior_content + 0.35·collaborative + 0.15·trending_prior`, with weights auto‑adjusted (more collaborative as event count grows).
- **Trending**: rolling 7‑day weighted event counts.
- **Search history** feeds the taste vector and powers "Based on your searches".

All recommendation logic runs in Postgres + edge functions (no external ML service); cosine similarity computed in TypeScript over compact tag vectors — fast for 200 products.

## AI Chatbot
Edge function calling Lovable AI (Gemini) with a system prompt that has access to the catalog + the user's recent events and preferences. Returns conversational suggestions with clickable product cards. Streams responses token‑by‑token.

## Admin Panel
Role‑based (admin role in `user_roles`). CRUD for products, image upload to Storage, toggle trending, view basic analytics (top viewed, top purchased).

## Deliverables
- Working app at the preview URL with seeded catalog, all pages, recs, wishlist, cart, simulated checkout, admin, and chatbot.
- Clean folder structure under `src/` (pages, components, contexts, hooks, lib, features/recommendations, features/admin, features/chat).
- In‑app "How recommendations work" info card on the profile page explaining the hybrid logic in plain language.
- README updates with setup steps and architecture overview.

## Out of scope for v1 (can add on request)
- Real payment processing (Stripe/Paddle) — currently simulated.
- Reviews & ratings submission by users (ratings are seeded).
- Email notifications for orders.
