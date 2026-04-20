"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RestaurantMap from "@/components/RestaurantMap";
import ChatPanel from "@/components/ChatPanel";
import { createClient } from "@/lib/supabase/client";

import type { Restaurant, Message } from "@/lib/types";

const SEARCH_HISTORY_KEY = "search-history";

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

export default function DashboardPage() {
  const router = useRouter();
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSearch = async (query: string) => {
    const createdAt = new Date().toISOString();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: query,
      createdAt,
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
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      const historyEntry = {
        prompt: query,
        createdAt: new Date().toISOString(),
      };

      try {
        const existingHistory = window.localStorage.getItem(SEARCH_HISTORY_KEY);
        const parsedHistory = existingHistory ? JSON.parse(existingHistory) : [];
        const nextHistory = Array.isArray(parsedHistory)
          ? [historyEntry, ...parsedHistory].slice(0, 100)
          : [historyEntry];
        window.localStorage.setItem(
          SEARCH_HISTORY_KEY,
          JSON.stringify(nextHistory)
        );
      } catch {}

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: data.aiMessage,
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
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
          onProfile={() => router.push("/profile")}
          onLogout={handleLogout}
        />
      </section>
    </main>
  );
}
