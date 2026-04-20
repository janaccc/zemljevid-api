"use client";

import { useEffect, useState } from "react";

export default function ParallaxBackground() {
  const [pos, setPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setPos({ x, y });
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Main glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40"
        style={{
          background: "radial-gradient(circle, #4fd1c5, transparent)",
          transform: `translate(${pos.x * 2}px, ${pos.y * 2}px)`,
        }}
      />

      {/* Secondary glow */}
      <div
        className="absolute right-0 bottom-0 w-[500px] h-[500px] rounded-full blur-[140px] opacity-30"
        style={{
          background: "radial-gradient(circle, #3b82f6, transparent)",
          transform: `translate(${-pos.x * 2}px, ${-pos.y * 2}px)`,
        }}
      />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:40px_40px]" />
    </div>
  );
}