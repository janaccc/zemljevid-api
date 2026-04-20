export type ParsedIntent = {
  food?: string;
  vibe?: string;
  price?: "cheap" | "moderate" | "expensive";
  area?: string;
  city?: string;
  openNow?: boolean;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  lat: number;
  lng: number;
  mapsUri?: string | null;
  websiteUri?: string | null;
  businessStatus?: string | null;
  primaryType?: string | null;
  editorialSummary?: string | null;
  score: number;
  reason: string;
};