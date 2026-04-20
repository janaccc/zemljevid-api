"use client";

import { useState, useRef, useEffect } from "react";
import type { Message, Restaurant } from "@/lib/types";

type Props = {
  messages: Message[];
  loading: boolean;
  onSearch: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
};

function priceLabel(value: string | null) {
  if (!value) return "";
  if (value === "INEXPENSIVE") return "€";
  if (value === "MODERATE") return "€€";
  if (value === "EXPENSIVE") return "€€€";
  if (value === "VERY_EXPENSIVE") return "€€€€";
  return "";
}

function RestaurantCard({
  restaurant,
  index,
  selected,
  onSelect,
}: {
  restaurant: Restaurant;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`chatCard ${selected ? "selected" : ""}`}
      onClick={() => onSelect(restaurant.id)}
    >
      <div className="chatCardTop">
        <div className="rank">#{index + 1}</div>
        <div>
          <div className="name">{restaurant.name}</div>
          <div className="address">{restaurant.address}</div>
        </div>
      </div>
      <div className="meta">
        {restaurant.rating && <span>⭐ {restaurant.rating}</span>}
        {restaurant.userRatingCount ? (
          <span>{restaurant.userRatingCount} ocen</span>
        ) : null}
        {priceLabel(restaurant.priceLevel) && (
          <span>{priceLabel(restaurant.priceLevel)}</span>
        )}
      </div>
      <div className="reason">
        <strong>Zakaj:</strong> {restaurant.reason}
      </div>
    </button>
  );
}

export default function ChatPanel({
  messages,
  loading,
  onSearch,
  selectedId,
  onSelect,
  userLocation,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    onSearch(q);
  };

  return (
    <div className="chatPanel">
      <div className="chatHeader">
        <h1>AI Food Finder</h1>
        <div className="locationBadge">
          {userLocation ? "📍 Tvoja lokacija" : "📍 Ljubljana (privzeto)"}
        </div>
      </div>

      <div className="chatMessages">
        {messages.length === 0 && (
          <div className="chatWelcome">
            <p>Pozdravljeni! Povej mi, kaj bi jedel danes.</p>
            <p className="muted">Primer: "danes bi jedel pico, ne predrago"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatBubbleWrapper ${msg.role === "user" ? "userWrapper" : "assistantWrapper"}`}
          >
            {msg.role === "assistant" && (
              <div className="avatar">🤖</div>
            )}
            <div className={`chatBubble ${msg.role === "user" ? "userBubble" : "assistantBubble"}`}>
              <p className="bubbleText">{msg.text}</p>
              {msg.restaurants && msg.restaurants.length > 0 && (
                <div className="chatResults">
                  {msg.restaurants.map((r, i) => (
                    <RestaurantCard
                      key={r.id}
                      restaurant={r}
                      index={i}
                      selected={r.id === selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chatBubbleWrapper assistantWrapper">
            <div className="avatar">🤖</div>
            <div className="chatBubble assistantBubble">
              <div className="typingDots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chatInputRow">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Kaj bi jedel danes?"
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Pošlji
        </button>
      </div>
    </div>
  );
}
