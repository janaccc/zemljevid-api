"use client";

import type { Restaurant } from "@/lib/types";

type Props = {
  query: string;
  setQuery: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function priceLabel(value: string | null) {
  if (!value) return "Ni podatka";
  if (value === "INEXPENSIVE") return "€";
  if (value === "MODERATE") return "€€";
  if (value === "EXPENSIVE") return "€€€";
  if (value === "VERY_EXPENSIVE") return "€€€€";
  return value;
}

export default function SearchPanel({
  query,
  setQuery,
  onSearch,
  loading,
  restaurants,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="panel">
      <div className="searchBox">
        <h1>AI Food Finder</h1>
        <p className="muted">
          Primer: “sushi, zmenek, ne predrago, Ljubljana center”
        </p>

        <div className="searchRow">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kaj bi jedel?"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
          <button onClick={onSearch} disabled={loading}>
            {loading ? "Iščem..." : "Najdi"}
          </button>
        </div>
      </div>

      <div className="results">
        {restaurants.length === 0 ? (
          <div className="empty">
            Še ni rezultatov. Vpiši željo in klikni “Najdi”.
          </div>
        ) : (
          restaurants.map((restaurant, index) => {
            const selected = restaurant.id === selectedId;

            return (
              <button
                key={restaurant.id}
                className={`card ${selected ? "selected" : ""}`}
                onClick={() => onSelect(restaurant.id)}
              >
                <div className="cardTop">
                  <div className="rank">#{index + 1}</div>
                  <div>
                    <div className="name">{restaurant.name}</div>
                    <div className="address">{restaurant.address}</div>
                  </div>
                </div>

                <div className="meta">
                  <span>⭐ {restaurant.rating ?? "N/A"}</span>
                  <span>{restaurant.userRatingCount ?? 0} ocen</span>
                  <span>{priceLabel(restaurant.priceLevel)}</span>
                </div>

                <div className="reason">
                  <strong>Zakaj:</strong> {restaurant.reason}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}