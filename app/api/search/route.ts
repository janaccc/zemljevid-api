import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ParsedIntent, Restaurant } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizePriceLevel(level?: string | null) {
  if (!level) return null;
  switch (level) {
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
    const name = place.displayName.text.toLowerCase();
    const food = intent.food.toLowerCase();
    if (name.includes(food)) {
      score += 10;
      reasons.push(`ujemanje: ${intent.food}`);
    }
  }

  if (place.businessStatus === "OPERATIONAL") {
    score += 5;
  }

  if (place.primaryType === "restaurant" || place.primaryType === "meal_takeaway") {
    score += 5;
  }

  const reason =
    reasons.length > 0
      ? reasons.slice(0, 3).join(", ")
      : "dober splošni rezultat";

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
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: `Iz uporabnikovega opisa hrane vrni SAMO JSON z lastnostmi: food, vibe, price, area, city, openNow. Price naj bo samo cheap, moderate ali expensive. Ne dodajaj razlage, samo JSON.\n\nPoizvedba: ${query}`,
  });

  const content = response.text ?? "{}";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    return {};
  }
}

function buildAiMessage(intent: ParsedIntent, count: number, usingLocation: boolean): string {
  const food = intent.food || "restavracije";
  const area = intent.area ? ` v ${intent.area}` : "";
  const city = intent.city ? ` (${intent.city})` : "";
  const locationNote = usingLocation ? " blizu tebe" : `${area}${city}`;

  if (count === 0) {
    return `Žal nisem našel nobene restavracije za "${food}"${locationNote}. Poskusi z drugačnim iskanjem.`;
  }

  const priceNote =
    intent.price === "cheap"
      ? " po dostopnih cenah"
      : intent.price === "expensive"
      ? " v višjem cenovnem razredu"
      : "";

  return `Našel sem ${count} restavracij za "${food}"${locationNote}${priceNote}. Tu so najboljše:`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body?.query ?? "").trim();
    const userLat = typeof body?.lat === "number" ? body.lat : null;
    const userLng = typeof body?.lng === "number" ? body.lng : null;
    const usingLocation = userLat !== null && userLng !== null;

    if (!query) {
      return NextResponse.json({ error: "Manjka query." }, { status: 400 });
    }

    const intent = await parseIntent(query);

    const city = intent.city || (usingLocation ? "" : "Ljubljana");
    const area = intent.area ? ` ${intent.area}` : "";
    const food = intent.food || "restaurant";
    const openNowText = intent.openNow ? " open now" : "";

    const textQuery = usingLocation
      ? `${food}${openNowText}`.trim()
      : `${food}${area} ${city}${openNowText}`.trim();

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
          radius: 5000,
        },
      };
    }

    const googleRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.websiteUri,places.businessStatus,places.primaryType,places.editorialSummary",
        },
        body: JSON.stringify(googleBody),
      }
    );

    if (!googleRes.ok) {
      const text = await googleRes.text();
      return NextResponse.json(
        { error: "Napaka pri Google Places API", details: text },
        { status: 500 }
      );
    }

    const googleData = await googleRes.json();
    const places = Array.isArray(googleData.places) ? googleData.places : [];

    const ranked = places
      .map((place: any) => scoreRestaurant(place, intent))
      .sort((a: Restaurant, b: Restaurant) => b.score - a.score);

    const aiMessage = buildAiMessage(intent, ranked.length, usingLocation);

    return NextResponse.json({
      query,
      intent,
      restaurants: ranked,
      selectedId: ranked[0]?.id ?? null,
      aiMessage,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Napaka na strežniku.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
