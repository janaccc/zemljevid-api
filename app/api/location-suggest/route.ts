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

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", query);
  url.searchParams.set("types", "(cities)");
  url.searchParams.set("components", "country:si");
  url.searchParams.set("language", "sl");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Napaka pri predlogih krajev.", details },
        { status: 500 }
      );
    }

    const data = await response.json();
    const predictions = Array.isArray(data.predictions) ? data.predictions : [];
    const suggestions = predictions
      .map((prediction: any) => prediction.description)
      .filter((value: unknown): value is string => typeof value === "string")
      .slice(0, 6);

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Napaka pri predlogih krajev.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
