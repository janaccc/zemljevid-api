import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ParsedIntent, Restaurant } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.0-flash";

const STOP_WORDS = new Set([
  "a",
  "ali",
  "bi",
  "blizu",
  "ce",
  "da",
  "da",
  "danes",
  "dejansko",
  "do",
  "dostava",
  "eur",
  "euro",
  "evra",
  "evrov",
  "ful",
  "hrana",
  "hocem",
  "hoce",
  "hocem",
  "hocem",
  "hočem",
  "i",
  "in",
  "jaz",
  "jaz",
  "kaj",
  "kje",
  "ki",
  "kos",
  "kosih",
  "lahko",
  "mi",
  "mi",
  "mogoce",
  "mogoče",
  "na",
  "naj",
  "nekaj",
  "ne",
  "no",
  "pa",
  "potem",
  "pod",
  "po",
  "pri",
  "rad",
  "rada",
  "res",
  "restavracija",
  "restavracije",
  "s",
  "sem",
  "si",
  "super",
  "to",
  "u",
  "v",
  "za",
  "zelo",
  "ampak",
  "jesti",
  "jedel",
  "jedla",
  "jem",
  "jejo",
]);

const FOOD_ALIASES: Array<{ canonical: string; patterns: string[] }> = [
  { canonical: "hot dog", patterns: ["hotdog", "hot dog", "hot-dog"] },
  { canonical: "pizza", patterns: ["pizza", "pica", "pizze"] },
  { canonical: "pizza slice", patterns: ["po kosih", "kos pice", "pizza slice"] },
  { canonical: "burger", patterns: ["burger", "hamburger"] },
  { canonical: "sushi", patterns: ["sushi"] },
  { canonical: "ramen", patterns: ["ramen"] },
  { canonical: "tacos", patterns: ["taco", "tacos"] },
  { canonical: "kebab", patterns: ["kebab"] },
  { canonical: "burek", patterns: ["burek"] },
  { canonical: "pasta", patterns: ["testenine", "pasta"] },
  { canonical: "steak", patterns: ["steak"] },
  { canonical: "vegan", patterns: ["veganska", "vegansko", "vegan"] },
  { canonical: "asian", patterns: ["azijska", "azijsko"] },
  { canonical: "chinese", patterns: ["kitajska", "kitajsko"] },
  { canonical: "indian", patterns: ["indijska", "indijsko"] },
  { canonical: "mexican", patterns: ["mehiska", "mehisko", "mehiska", "mehisko"] },
  { canonical: "japanese", patterns: ["japonska", "japonsko"] },
  { canonical: "italian", patterns: ["italijanska", "italijansko"] },
  { canonical: "mediterranean", patterns: ["mediteranska", "mediteransko"] },
  { canonical: "seafood", patterns: ["morska", "morsko", "ribe", "seafood"] },
];

const CITY_ALIASES: Array<{ canonical: string; patterns: string[] }> = [
  { canonical: "Ljubljana", patterns: ["ljubljana", "lj"] },
  { canonical: "Maribor", patterns: ["maribor", "mb"] },
  { canonical: "Koper", patterns: ["koper"] },
  { canonical: "Celje", patterns: ["celje"] },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizePriceLevel(level?: string | null) {
  if (!level) return null;

  switch (level.replace("PRICE_LEVEL_", "")) {
    case "INEXPENSIVE":
      return "cheap";
    case "MODERATE":
      return "moderate";
    case "EXPENSIVE":
    case "VERY_EXPENSIVE":
      return "expensive";
    default:
      return null;
  }
}

function extractMatch(query: string, patterns: string[]) {
  for (const pattern of patterns) {
    const match = query.match(new RegExp(pattern, "i"));
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function splitFilters(query: string) {
  return query
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getPriceIntent(query: string): ParsedIntent["price"] {
  const normalized = normalizeText(query);

  // "ne predrag" means user does not want expensive; treat as moderate by default.
  if (
    normalized.includes("ne predrag") ||
    normalized.includes("ne predrago") ||
    normalized.includes("predrag") ||
    normalized.includes("predrago") ||
    normalized.includes("ne drago")
  ) {
    return "moderate";
  }

  const numericMatch = normalized.match(
    /(pod|do|manj kot)\s*(\d+(?:[.,]\d+)?)\s*(eur|euro|evra|evrov)?/
  );

  if (numericMatch) {
    const amount = Number(numericMatch[2].replace(",", "."));
    if (amount <= 7) return "cheap";
    if (amount <= 15) return "moderate";
    return "expensive";
  }

  if (
    normalized.includes("poceni") ||
    normalized.includes("ugodno") ||
    normalized.includes("cheap") ||
    normalized.includes("budget")
  ) {
    return "cheap";
  }

  if (
    normalized.includes("drago") ||
    normalized.includes("expensive") ||
    normalized.includes("premium") ||
    normalized.includes("fancy")
  ) {
    return "expensive";
  }

  if (
    normalized.includes("zmerno") ||
    normalized.includes("srednje") ||
    normalized.includes("moderate")
  ) {
    return "moderate";
  }

  return undefined;
}

function getFoodIntent(query: string) {
  const normalized = normalizeText(query);

  for (const alias of FOOD_ALIASES) {
    if (alias.patterns.some((pattern) => normalized.includes(pattern))) {
      return alias.canonical;
    }
  }

  // Try to extract the food after "jesti/jedel/jedla/jem" type phrasing.
  const eatMatch =
    normalized.match(/\b(?:rad\s+)?(?:bi\s+)?(?:jedel|jedla|jesti|jem)\s+([a-z0-9][a-z0-9\s-]{1,60})/i) ||
    normalized.match(/\b(?:hocem|hoce[m]?|hočem)\s+(?:jesti|pojesti)\s+([a-z0-9][a-z0-9\s-]{1,60})/i);

  if (eatMatch?.[1]) {
    const candidate = eatMatch[1]
      .replace(/\b(ampak|pa|prosim|pls|danes|jutri|ne|pod|do|manj|kot)\b/g, " ")
      .trim();

    const tokens = candidate
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => !STOP_WORDS.has(token))
      .slice(0, 3);

    if (tokens.length > 0) {
      return tokens.join(" ");
    }
  }

  const cleanedTokens = normalized
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => !/^\d+(?:[.,]\d+)?$/.test(token));

  if (cleanedTokens.length === 0) {
    return undefined;
  }

  return cleanedTokens.slice(0, 3).join(" ");
}

function getCityIntent(query: string) {
  const normalized = normalizeText(query);

  for (const city of CITY_ALIASES) {
    if (city.patterns.some((pattern) => normalized.includes(pattern))) {
      return city.canonical;
    }
  }

  return undefined;
}

function getAreaIntent(query: string) {
  const normalized = normalizeText(query);
  const extracted = extractMatch(normalized, [
    "v\\s+([a-z\\-\\s]+)",
    "blizu\\s+([a-z\\-\\s]+)",
    "na\\s+([a-z\\-\\s]+)",
  ]);

  if (!extracted) {
    return undefined;
  }

  const trimmed = extracted
    .replace(/\b(odprto|open now|poceni|ugodno|cheap|drago|premium)\b/g, "")
    .trim();

  return trimmed || undefined;
}

function mergeIntentParts(parts: ParsedIntent[]): ParsedIntent {
  return parts.reduce<ParsedIntent>((merged, part) => {
    if (!merged.food && part.food) merged.food = part.food;
    if (!merged.vibe && part.vibe) merged.vibe = part.vibe;
    if (!merged.price && part.price) merged.price = part.price;
    if (!merged.area && part.area) merged.area = part.area;
    if (!merged.city && part.city) merged.city = part.city;
    if (!merged.openNow && part.openNow) merged.openNow = true;
    return merged;
  }, {});
}

function parseFilterPart(part: string): ParsedIntent {
  const normalized = normalizeText(part);

  return {
    food: getFoodIntent(part),
    area: getAreaIntent(part),
    city: getCityIntent(part),
    price: getPriceIntent(part),
    openNow:
      normalized.includes("odprto") || normalized.includes("open now"),
  };
}

function parseIntentFallback(query: string): ParsedIntent {
  const parts = splitFilters(query);
  if (parts.length === 0) {
    return {};
  }

  const partials = parts.map(parseFilterPart);
  const merged = mergeIntentParts(partials);

  if (!merged.food) {
    merged.food = getFoodIntent(query);
  }

  if (!merged.price) {
    merged.price = getPriceIntent(query);
  }

  if (!merged.area) {
    merged.area = getAreaIntent(query);
  }

  if (!merged.city) {
    merged.city = getCityIntent(query);
  }

  if (!merged.openNow) {
    const normalized = normalizeText(query);
    merged.openNow =
      normalized.includes("odprto") || normalized.includes("open now");
  }

  return merged;
}

function scoreRestaurant(place: any, intent: ParsedIntent): Restaurant {
  const rating = typeof place.rating === "number" ? place.rating : null;
  const userRatingCount =
    typeof place.userRatingCount === "number" ? place.userRatingCount : null;

  const lat = place.location?.latitude ?? 0;
  const lng = place.location?.longitude ?? 0;
  const priceLevel = place.priceLevel ?? null;
  const normalizedPrice = normalizePriceLevel(priceLevel);

  let score = 0;
  const reasons: string[] = [];

  if (rating !== null) {
    const ratingScore = clamp((rating / 5) * 40, 0, 40);
    score += ratingScore;
    if (rating >= 4.5) reasons.push("zelo dobra ocena");
    else if (rating >= 4.2) reasons.push("dobra ocena");
  }

  if (userRatingCount !== null) {
    const popularityScore = clamp(Math.log10(userRatingCount + 1) * 10, 0, 20);
    score += popularityScore;
    if (userRatingCount > 500) reasons.push("veliko ocen");
  }

  if (intent.price && normalizedPrice) {
    if (intent.price === normalizedPrice) {
      score += 20;
      reasons.push("ustreza budgetu");
    } else if (
      (intent.price === "cheap" && normalizedPrice === "moderate") ||
      (intent.price === "moderate" &&
        (normalizedPrice === "cheap" || normalizedPrice === "expensive")) ||
      (intent.price === "expensive" && normalizedPrice === "moderate")
    ) {
      score += 8;
    }
  } else {
    score += 5;
  }

  if (intent.food && typeof place.displayName?.text === "string") {
    const name = normalizeText(place.displayName.text);
    const food = normalizeText(intent.food);
    if (name.includes(food)) {
      score += 10;
      reasons.push(`ujemanje: ${intent.food}`);
    }
  }

  if (place.businessStatus === "OPERATIONAL") {
    score += 5;
  }

  if (
    place.primaryType === "restaurant" ||
    place.primaryType === "meal_takeaway"
  ) {
    score += 5;
  }

  const reason =
    reasons.length > 0
      ? reasons.slice(0, 3).join(", ")
      : "dober splosni rezultat";

  return {
    id: place.id,
    name: place.displayName?.text ?? "Unknown",
    address: place.formattedAddress ?? "",
    rating,
    userRatingCount,
    priceLevel,
    lat,
    lng,
    mapsUri: place.googleMapsUri ?? null,
    websiteUri: place.websiteUri ?? null,
    businessStatus: place.businessStatus ?? null,
    primaryType: place.primaryType ?? null,
    editorialSummary: place.editorialSummary?.text ?? null,
    score: Math.round(score),
    reason,
  };
}

async function parseIntent(query: string): Promise<ParsedIntent> {
  if (!process.env.GEMINI_API_KEY) {
    return parseIntentFallback(query);
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Iz uporabnikovega opisa hrane vrni SAMO JSON z lastnostmi: food, vibe, price, area, city, openNow. Price naj bo samo cheap, moderate ali expensive. Ne dodajaj razlage, samo JSON.\n\nPoizvedba: ${query}`,
    });

    const content = response.text ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : parseIntentFallback(query);
  } catch {
    return parseIntentFallback(query);
  }
}

function buildFallbackMessage(
  intent: ParsedIntent,
  count: number,
  usingLocation: boolean
) {
  const food = intent.food || "restavracije";
  const area = intent.area ? ` v ${intent.area}` : "";
  const city = intent.city ? ` (${intent.city})` : "";
  const locationNote = usingLocation ? " blizu tebe" : `${area}${city}`;

  if (count === 0) {
    return `Zal nisem nasel nobene restavracije za "${food}"${locationNote}. Poskusi z drugacnim iskanjem.`;
  }

  const priceNote =
    intent.price === "cheap"
      ? " po dostopnih cenah"
      : intent.price === "expensive"
        ? " v visjem cenovnem razredu"
        : "";

  return `Nasel sem ${count} rezultatov za "${food}"${locationNote}${priceNote}. Tu so najboljsi zadetki.`;
}

async function generateAiReply(
  query: string,
  intent: ParsedIntent,
  restaurants: Restaurant[],
  usingLocation: boolean
) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      message: buildFallbackMessage(intent, restaurants.length, usingLocation),
      usedGemini: false,
    };
  }

  const shortlist = restaurants.slice(0, 5).map((restaurant) => ({
    name: restaurant.name,
    address: restaurant.address,
    rating: restaurant.rating,
    userRatingCount: restaurant.userRatingCount,
    priceLevel: restaurant.priceLevel,
    reason: restaurant.reason,
  }));

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `
Uporabnik je napisal:
"${query}"

Prepoznan namen:
${JSON.stringify(intent)}

Najdene restavracije:
${JSON.stringify(shortlist)}

Odgovori v slovenscini, v prijaznem tonu, v najvec 3 kratkih stavkih.
Ce obstajajo rezultati, na kratko povej kaj si nasel in omeni 2 do 3 najbolj relevantne restavracije po imenu.
Ce rezultatov ni, povej da trenutno ni zadetkov in predlagaj bolj konkretno iskanje.
Ne izmisli si restavracij in ne uporabljaj markdown seznamov.
      `.trim(),
    });

    const message =
      response.text?.trim() ||
      buildFallbackMessage(intent, restaurants.length, usingLocation);

    return {
      message,
      usedGemini: Boolean(response.text?.trim()),
    };
  } catch {
    return {
      message: buildFallbackMessage(intent, restaurants.length, usingLocation),
      usedGemini: false,
    };
  }
}

function buildTextQuery(intent: ParsedIntent, usingLocation: boolean) {
  const parts: string[] = [];

  parts.push(intent.food || "restaurant");

  if (intent.price === "cheap") {
    parts.push("cheap");
  } else if (intent.price === "expensive") {
    parts.push("fine dining");
  }

  if (intent.openNow) {
    parts.push("open now");
  }

  if (!usingLocation) {
    if (intent.area) parts.push(intent.area);
    if (intent.city) parts.push(intent.city);
    else parts.push("Ljubljana");
  }

  return parts.join(" ").trim();
}

async function geocodeLocation(locationQuery: string, apiKey: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", locationQuery);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", "si");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Napaka pri geocoding zahtevi.");
  }

  const data = await response.json();
  const first = Array.isArray(data.results) ? data.results[0] : null;

  if (!first?.geometry?.location) {
    return null;
  }

  return {
    lat: first.geometry.location.lat as number,
    lng: first.geometry.location.lng as number,
  };
}

async function saveSearchHistory(query: string, resultCount: number) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await createAdminClient()
      .from("searches")
      .insert({ query, result_count: resultCount, user_id: user?.id ?? null });
  } catch (error) {
    console.error("Failed to save search history:", error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body?.query ?? "").trim();
    let userLat = typeof body?.lat === "number" ? body.lat : null;
    let userLng = typeof body?.lng === "number" ? body.lng : null;
    const radiusKm =
      typeof body?.radiusKm === "number"
        ? Math.max(5, Math.min(100, body.radiusKm))
        : 15;
    const locationQuery = String(body?.locationQuery ?? "").trim();

    if (!query) {
      return NextResponse.json({ error: "Manjka query." }, { status: 400 });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: "Manjka GOOGLE_MAPS_API_KEY." },
        { status: 500 }
      );
    }

    if ((userLat === null || userLng === null) && locationQuery) {
      const geocoded = await geocodeLocation(
        locationQuery,
        process.env.GOOGLE_MAPS_API_KEY
      );

      if (geocoded) {
        userLat = geocoded.lat;
        userLng = geocoded.lng;
      }
    }

    const usingLocation = userLat !== null && userLng !== null;

    const intent = await parseIntent(query);
    const textQuery = buildTextQuery(intent, usingLocation);

    const googleBody: any = {
      textQuery,
      maxResultCount: 12,
      languageCode: "sl",
      regionCode: "SI",
    };

    if (usingLocation) {
      googleBody.locationBias = {
        circle: {
          center: { latitude: userLat, longitude: userLng },
          radius: radiusKm * 1000,
        },
      };
    }

    const googleRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.websiteUri,places.businessStatus,places.primaryType,places.editorialSummary",
        },
        body: JSON.stringify(googleBody),
      }
    );

    if (!googleRes.ok) {
      const text = await googleRes.text();
      return NextResponse.json(
        { error: "Napaka pri Google Places API.", details: text },
        { status: 500 }
      );
    }

    const googleData = await googleRes.json();
    const places = Array.isArray(googleData.places) ? googleData.places : [];

    const filteredPlaces = usingLocation
      ? places.filter((place: any) => {
          const lat = place.location?.latitude;
          const lng = place.location?.longitude;

          if (typeof lat !== "number" || typeof lng !== "number") {
            return false;
          }

          return distanceKm(userLat!, userLng!, lat, lng) <= radiusKm;
        })
      : places;

    const ranked = filteredPlaces
      .map((place: any) => scoreRestaurant(place, intent))
      .sort((a: Restaurant, b: Restaurant) => b.score - a.score);

    const aiReply = await generateAiReply(
      query,
      intent,
      ranked,
      usingLocation
    );
    await saveSearchHistory(query, ranked.length);

    return NextResponse.json({
      query,
      intent,
      textQuery,
      radiusKm,
      restaurants: ranked,
      selectedId: ranked[0]?.id ?? null,
      aiMessage: aiReply.message,
      aiPowered: aiReply.usedGemini,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Napaka na strezniku.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
