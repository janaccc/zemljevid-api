import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Manjka GOOGLE_MAPS_API_KEY." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ error: "Manjka kraj." }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("region", "si");
  url.searchParams.set("language", "sl");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Napaka pri geocoding zahtevi.", details },
        { status: 500 }
      );
    }

    const data = await response.json();
    const first = Array.isArray(data.results) ? data.results[0] : null;

    if (!first?.geometry?.location) {
      return NextResponse.json(
        { error: "Kraja ni bilo mogoce najti." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      label: first.formatted_address ?? query,
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Napaka pri geocoding zahtevi.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
