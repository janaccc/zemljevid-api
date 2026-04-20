"use client";

import { useEffect, useRef } from "react";
import type { Restaurant } from "@/lib/types";

declare global {
  interface Window {
    google: any;
  }
}

type Props = {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function RestaurantMap({
  restaurants,
  selectedId,
  onSelect,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (window.google || document.getElementById("google-maps-script")) return;

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&v=weekly&libraries=marker`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!mapRef.current || !window.google) return;
      if (mapInstanceRef.current) return;

      const center =
        restaurants.length > 0
          ? { lat: restaurants[0].lat, lng: restaurants[0].lng }
          : { lat: 46.0569, lng: 14.5058 };

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();
    };

    const waitForGoogle = async () => {
      let tries = 0;
      while (!window.google && tries < 50) {
        await new Promise((r) => setTimeout(r, 200));
        tries++;
      }
      await init();
    };

    waitForGoogle();
  }, [restaurants]);

  useEffect(() => {
    const renderMarkers = async () => {
      if (!window.google || !mapInstanceRef.current) return;

      const { AdvancedMarkerElement, PinElement } =
        await window.google.maps.importLibrary("marker");

      for (const marker of markersRef.current.values()) {
        marker.map = null;
      }
      markersRef.current.clear();

      restaurants.forEach((restaurant, index) => {
        const isSelected = restaurant.id === selectedId;

        const pin = new PinElement({
          glyph: String(index + 1),
          scale: isSelected ? 1.3 : 1,
        });

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: { lat: restaurant.lat, lng: restaurant.lng },
          title: restaurant.name,
          content: pin.element,
        });

        marker.addListener("click", () => {
          onSelect(restaurant.id);

          infoWindowRef.current.setContent(`
            <div style="max-width:240px">
              <strong>${restaurant.name}</strong><br />
              <div>${restaurant.address}</div>
              <div>Ocena: ${restaurant.rating ?? "Ni podatka"}</div>
            </div>
          `);

          infoWindowRef.current.open({
            anchor: marker,
            map: mapInstanceRef.current,
          });
        });

        markersRef.current.set(restaurant.id, marker);
      });
    };

    renderMarkers();
  }, [restaurants, selectedId, onSelect]);

  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current || !window.google) return;

    const restaurant = restaurants.find((r) => r.id === selectedId);
    if (!restaurant) return;

    mapInstanceRef.current.panTo({ lat: restaurant.lat, lng: restaurant.lng });
    mapInstanceRef.current.setZoom(15);

    const marker = markersRef.current.get(selectedId);
    if (marker && infoWindowRef.current) {
      infoWindowRef.current.setContent(`
        <div style="max-width:240px">
          <strong>${restaurant.name}</strong><br />
          <div>${restaurant.address}</div>
          <div>Ocena: ${restaurant.rating ?? "Ni podatka"}</div>
          <div>Zakaj: ${restaurant.reason}</div>
        </div>
      `);

      infoWindowRef.current.open({
        anchor: marker,
        map: mapInstanceRef.current,
      });
    }
  }, [selectedId, restaurants]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "70vh",
        borderRadius: 16,
        overflow: "hidden",
      }}
    />
  );
}