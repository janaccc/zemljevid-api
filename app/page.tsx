"use client";

import { useState, useEffect } from "react";
import RestaurantMap from "@/components/RestaurantMap";
import ChatPanel from "@/components/ChatPanel";
import type { Restaurant, Message } from "@/lib/types";

type SearchLocation =
  | {
      mode: "default";
      label: string;
      radiusKm: number;
      lat?: number;
      lng?: number;
    }
  | {
      mode: "auto";
      label: string;
      radiusKm: number;
      lat: number;
      lng: number;
    }
  | {
      mode: "manual";
      label: string;
      radiusKm: number;
      locationQuery: string;
      lat?: number;
      lng?: number;
    };

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState<SearchLocation>({
    mode: "default",
    label: "Ljubljana (privzeto)",
    radiusKm: 15,
  });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        setSearchLocation((current) =>
          current.mode === "manual"
            ? current
            : {
                mode: "auto",
                label: "Tvoja lokacija",
                radiusKm: current.radiusKm,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }
        ),
      () => {}
    );
  }, []);

  const handleSearch = async (query: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          lat:
            searchLocation.mode === "auto" ||
            (searchLocation.mode === "manual" && typeof searchLocation.lat === "number")
              ? searchLocation.lat
              : undefined,
          lng:
            searchLocation.mode === "auto" ||
            (searchLocation.mode === "manual" && typeof searchLocation.lng === "number")
              ? searchLocation.lng
              : undefined,
          locationQuery:
            searchLocation.mode === "manual"
              ? searchLocation.locationQuery
              : undefined,
          radiusKm: searchLocation.radiusKm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            text: data.error || "Napaka pri iskanju.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: data.aiMessage,
          restaurants: data.restaurants,
        },
      ]);
      setRestaurants(data.restaurants || []);
      setSelectedId(data.selectedId || null);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "Napaka pri iskanju. Poskusi znova.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="left">
        <RestaurantMap
          restaurants={restaurants}
          selectedId={selectedId}
          onSelect={setSelectedId}
          mapFocus={
            typeof searchLocation.lat === "number" &&
            typeof searchLocation.lng === "number"
              ? {
                  lat: searchLocation.lat,
                  lng: searchLocation.lng,
                  label: searchLocation.label,
                  radiusKm: searchLocation.radiusKm,
                }
              : null
          }
        />
      </section>

      <section className="right">
        <ChatPanel
          messages={messages}
          loading={loading}
          onSearch={handleSearch}
          selectedId={selectedId}
          onSelect={setSelectedId}
          searchLocation={searchLocation}
          onUpdateLocation={setSearchLocation}
        />
      </section>
    </main>
  );
}
