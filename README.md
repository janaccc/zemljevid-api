# AI Food Finder (Next.js)

Chat + mapa za iskanje restavracij. V chatu vprasas (tudi z vec filtri, locenimi z vejico), aplikacija pa vrne zadetke in jih oznaci na mapi.

## Kaj zna

- Iskanje restavracij prek Google Places (Text Search)
- Klik na rezultat -> fokus marker + info okno na mapi
- Nastavitev kraja in radija (5-100 km) + predlogi krajev med tipkanjem
- Filtri, loceni z vejico (npr. `pica, pod 5 eur, center`)
- Opcijsko: Gemini za parsing namena in lepse besedilo odgovora

## Zagon

```bash
npm install
npm run dev
```

Odpri `http://localhost:3000`.

## Okoljske spremenljivke

Ustvari `.env.local`:

```env
# Server-side (API rute)
GOOGLE_MAPS_API_KEY=...
GEMINI_API_KEY=...               # opcijsko

# Client-side (Google Maps JS script v brskalniku)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=...  # opcijsko (Advanced Markers)
```

Opomba: kljucev ne commitaj v git.

## API rute

- `POST /api/search` (body: `query`, `lat/lng` ali `locationQuery`, `radiusKm`)
- `GET /api/location-suggest?q=...` (predlogi krajev)
- `GET /api/geocode?q=...` (pretvorba kraja v lat/lng)

