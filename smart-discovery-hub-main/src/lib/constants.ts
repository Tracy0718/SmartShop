export const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Kitchen",
  "Beauty",
  "Sports & Outdoors",
  "Books",
  "Toys",
  "Grocery",
] as const;

export type Category = typeof CATEGORIES[number];

export const INTERESTS = [
  "tech", "gaming", "fitness", "outdoor", "running", "cooking", "reading", "travel",
  "music", "photography", "fashion", "beauty", "wellness", "kids", "pets", "DIY",
];
