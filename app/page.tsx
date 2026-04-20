"use client";

import { useState, useEffect } from "react";
import RestaurantMap from "@/components/RestaurantMap";
import ChatPanel from "@/components/ChatPanel";
import type { Restaurant, Message } from "@/lib/types";

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
          lat: userLocation?.lat,
          lng: userLocation?.lng,
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
        />
      </section>

      <section className="right">
        <ChatPanel
          messages={messages}
          loading={loading}
          onSearch={handleSearch}
          selectedId={selectedId}
          onSelect={setSelectedId}
          userLocation={userLocation}
        />
      </section>
    </main>
  );
}
