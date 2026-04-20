"use client";

import { useState } from "react";
import RestaurantMap from "@/components/RestaurantMap";
import SearchPanel from "@/components/SearchPanel";
import type { Restaurant } from "@/lib/types";

export default function HomePage() {
  const [query, setQuery] = useState("pizza, poceni, Ljubljana center");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        alert(data.error || "Napaka pri iskanju.");
        return;
      }

      setRestaurants(data.restaurants || []);
      setSelectedId(data.selectedId || null);
    } catch (error) {
      console.error(error);
      alert("Napaka pri iskanju.");
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
        <SearchPanel
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          loading={loading}
          restaurants={restaurants}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>
    </main>
  );
}