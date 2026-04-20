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
  mapFocus: { lat: number; lng: number; label: string; radiusKm: number } | null;
};

export default function RestaurantMap({
  restaurants,
  selectedId,
  onSelect,
  mapFocus,
}: Props) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const focusMarkerRef = useRef<any>(null);

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const priceLabel = (value: string | null) => {
    if (!value) return "";
    if (value.includes("INEXPENSIVE")) return "EUR";
    if (value.includes("MODERATE")) return "EUR EUR";
    if (value.includes("EXPENSIVE")) return "EUR EUR EUR";
    if (value.includes("VERY_EXPENSIVE")) return "EUR EUR EUR EUR";
    return "";
  };

  const buildInfoWindowContent = (restaurant: Restaurant) => {
    const rating =
      restaurant.rating !== null ? `${restaurant.rating} zvezdic` : "Ni podatka";
    const reviewCount = restaurant.userRatingCount
      ? `${restaurant.userRatingCount} ocen`
      : "Brez ocen";
    const price = priceLabel(restaurant.priceLevel);

    return `
      <div style="max-width:260px;color:#0f172a;font-family:Arial, Helvetica, sans-serif;line-height:1.45;">
        <div style="font-size:16px;font-weight:700;margin-bottom:6px;">
          ${escapeHtml(restaurant.name)}
        </div>
        <div style="font-size:13px;color:#475569;margin-bottom:8px;">
          ${escapeHtml(restaurant.address)}
        </div>
        <div style="font-size:13px;margin-bottom:4px;">
          <strong>Ocena:</strong> ${escapeHtml(rating)}
        </div>
        <div style="font-size:13px;margin-bottom:4px;">
          <strong>Ocene:</strong> ${escapeHtml(reviewCount)}
        </div>
        ${
          price
            ? `<div style="font-size:13px;margin-bottom:4px;"><strong>Cena:</strong> ${escapeHtml(price)}</div>`
            : ""
        }
        <div style="font-size:13px;">
          <strong>Zakaj:</strong> ${escapeHtml(restaurant.reason)}
        </div>
      </div>
    `;
  };

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
        ...(mapId ? { mapId } : {}),
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

      for (const marker of markersRef.current.values()) {
        if (typeof marker.setMap === "function") {
          marker.setMap(null);
        } else {
          marker.map = null;
        }
      }
      markersRef.current.clear();

      const openInfoWindow = (marker: any, restaurant: Restaurant) => {
        infoWindowRef.current.setContent(buildInfoWindowContent(restaurant));

        infoWindowRef.current.open({
          anchor: marker,
          map: mapInstanceRef.current,
        });
      };

      if (!mapId) {
        restaurants.forEach((restaurant, index) => {
          const isSelected = restaurant.id === selectedId;
          const marker = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            position: { lat: restaurant.lat, lng: restaurant.lng },
            title: restaurant.name,
            label: {
              text: String(index + 1),
              color: "white",
              fontWeight: "700",
            },
            animation: isSelected
              ? window.google.maps.Animation.BOUNCE
              : undefined,
          });

          marker.addListener("click", () => {
            onSelect(restaurant.id);
            openInfoWindow(marker, restaurant);
          });

          markersRef.current.set(restaurant.id, marker);
        });

        return;
      }

      const { AdvancedMarkerElement, PinElement } =
        await window.google.maps.importLibrary("marker");

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
          openInfoWindow(marker, restaurant);
        });

        markersRef.current.set(restaurant.id, marker);
      });
    };

    renderMarkers();
  }, [restaurants, selectedId, onSelect]);

  useEffect(() => {
    if (!mapFocus || !mapInstanceRef.current || !window.google) return;
    if (selectedId) return;

    mapInstanceRef.current.panTo({ lat: mapFocus.lat, lng: mapFocus.lng });

    const zoom =
      mapFocus.radiusKm <= 8
        ? 13
        : mapFocus.radiusKm <= 15
          ? 12
          : mapFocus.radiusKm <= 30
            ? 11
            : mapFocus.radiusKm <= 60
              ? 10
              : 9;

    mapInstanceRef.current.setZoom(zoom);
  }, [mapFocus, selectedId]);

  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current || !window.google) return;

    const restaurant = restaurants.find((r) => r.id === selectedId);
    if (!restaurant) return;

    mapInstanceRef.current.panTo({ lat: restaurant.lat, lng: restaurant.lng });
    mapInstanceRef.current.setZoom(15);

    const marker = markersRef.current.get(selectedId);
    if (marker && infoWindowRef.current) {
      if (focusMarkerRef.current) {
        focusMarkerRef.current.setMap(null);
      }

      focusMarkerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: { lat: restaurant.lat, lng: restaurant.lng },
        title: restaurant.name,
        animation: window.google.maps.Animation.DROP,
        zIndex: 999,
      });

      infoWindowRef.current.setContent(buildInfoWindowContent(restaurant));

      infoWindowRef.current.open({
        anchor: focusMarkerRef.current,
        map: mapInstanceRef.current,
      });

      if (typeof marker.setAnimation === "function") {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        window.setTimeout(() => marker.setAnimation(null), 700);
      }
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
