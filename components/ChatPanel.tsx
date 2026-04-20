"use client";

import { useState, useRef, useEffect } from "react";
import type { Message, Restaurant } from "@/lib/types";

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

type Props = {
  messages: Message[];
  loading: boolean;
  onSearch: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchLocation: SearchLocation;
  onUpdateLocation: (location: SearchLocation) => void;
  onProfile?: () => void;
  onLogout?: () => void;
};

function priceLabel(value: string | null) {
  if (!value) return "";
  if (value.includes("INEXPENSIVE")) return "€ 5-10 €";
  if (value.includes("MODERATE")) return "€€ 10-25 €";
  if (value.includes("EXPENSIVE") || value.includes("VERY_EXPENSIVE")) {
    return "€€€ 25+ €";
  }
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
        {restaurant.rating && <span>★ {restaurant.rating}</span>}
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
  searchLocation,
  onUpdateLocation,
  onProfile,
  onLogout,
}: Props) {
  const [input, setInput] = useState("");
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [locationInput, setLocationInput] = useState(
    searchLocation.mode === "manual" ? searchLocation.locationQuery : "Ljubljana"
  );
  const [radiusKm, setRadiusKm] = useState(searchLocation.radiusKm);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setRadiusKm(searchLocation.radiusKm);
    setLocationInput(
      searchLocation.mode === "manual" ? searchLocation.locationQuery : "Ljubljana"
    );
    setLocationError("");
  }, [searchLocation]);

  useEffect(() => {
    if (!showLocationSettings) {
      setLocationSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const query = locationInput.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const response = await fetch(
          `/api/location-suggest?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (!response.ok) {
          setLocationSuggestions([]);
          return;
        }

        setLocationSuggestions(
          Array.isArray(data.suggestions) ? data.suggestions : []
        );
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [locationInput, showLocationSettings]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    onSearch(q);
  };

  const handleSaveManualLocation = async () => {
    const value = locationInput.trim();
    if (!value) return;

    try {
      setSavingLocation(true);
      setLocationError("");

      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(value)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setLocationError(data.error || "Kraja ni bilo mogoce najti.");
        return;
      }

      onUpdateLocation({
        mode: "manual",
        label: data.label || value,
        locationQuery: value,
        radiusKm,
        lat: data.lat,
        lng: data.lng,
      });
      setLocationSuggestions([]);
      setShowLocationSettings(false);
    } catch {
      setLocationError("Kraja ni bilo mogoce najti.");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleUseDefaultLocation = () => {
    onUpdateLocation({
      mode: "default",
      label: "Ljubljana (privzeto)",
      radiusKm,
      lat: 46.0569,
      lng: 14.5058,
    });
    setLocationSuggestions([]);
    setShowLocationSettings(false);
  };

  const handleUseCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        onUpdateLocation({
          mode: "auto",
          label: "Tvoja lokacija",
          radiusKm,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationSuggestions([]);
        setShowLocationSettings(false);
      },
      () => {}
    );
  };

  return (
    <div className="chatPanel">
      <div className="chatActionRow top">
        <button type="button" className="chatActionBtn" onClick={onProfile}>
          Moj profil
        </button>
        <button type="button" className="chatActionBtn danger" onClick={onLogout}>
          Odjava
        </button>
      </div>

      <div className="chatHeader">
        <h1>AI Food Finder</h1>
        <div className="locationTools">
          <button
            type="button"
            className="locationBadge locationButton"
            onClick={() => setShowLocationSettings((open) => !open)}
          >
            {searchLocation.label} · {searchLocation.radiusKm} km
          </button>

          {showLocationSettings && (
            <div className="locationPopover">
              <label className="locationField">
                <span>Kraj</span>
                <input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Npr. Ljubljana center"
                />
                {locationError && (
                  <div className="locationError">{locationError}</div>
                )}
                {loadingSuggestions && (
                  <div className="locationHint">Iskanje predlogov...</div>
                )}
                {!loadingSuggestions && locationSuggestions.length > 0 && (
                  <div className="locationSuggestions">
                    {locationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="locationSuggestion"
                        onClick={() => {
                          setLocationInput(suggestion);
                          setLocationSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              <label className="locationField">
                <span>Radij: {radiusKm} km</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                />
              </label>

              <div className="locationActions">
                <button type="button" onClick={handleSaveManualLocation}>
                  {savingLocation ? "Shranjujem..." : "Shrani"}
                </button>
                <button type="button" onClick={handleUseDefaultLocation}>
                  Ljubljana
                </button>
                <button type="button" onClick={handleUseCurrentLocation}>
                  Moja lokacija
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chatSpacer" />

      <div className="chatMessages">
        {messages.length === 0 && (
          <div className="chatWelcome">
            <p>Pozdravljeni! Povej mi, kaj bi jedel danes.</p>
            <p className="muted">Primer: "pica, po kosih, pod 5 eur, center"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatBubbleWrapper ${msg.role === "user" ? "userWrapper" : "assistantWrapper"}`}
          >
            {msg.role === "assistant" && <div className="avatar">🤖</div>}
            <div
              className={`chatBubble ${msg.role === "user" ? "userBubble" : "assistantBubble"}`}
            >
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
                <span />
                <span />
                <span />
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
          Poslji
        </button>
      </div>
    </div>
  );
}
