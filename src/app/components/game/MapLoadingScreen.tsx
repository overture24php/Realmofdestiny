// MapLoadingScreen.tsx
// ── Canvas-based horizontal loading bar + pixel-art RPG UI ────────────────────
// Muncul setiap kali player berpindah map.
// Style mengacu pada referensi: dark-charcoal panel, top-highlight strip biru-silver,
// inner glow gold—purple gradient di loading bar (canvas, bukan DOM).

import React, { useEffect, useRef } from "react";

interface MapLoadingScreenProps {
  visible   : boolean;
  mapName   : string;
  progress  : number; // 0..1
}

// ── Canvas draw constants ─────────────────────────────────────────────────────
const BAR_W = 300;
const BAR_H = 18;

export function MapLoadingScreen({ visible, mapName, progress }: MapLoadingScreenProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const progressRef  = useRef(0);
  const displayRef   = useRef(0);   // smoothed display value
  const rafRef       = useRef(0);

  // Keep progressRef always in sync (readable by rAF loop each frame)
  progressRef.current = progress;

  useEffect(() => {
    if (!visible) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset smooth display at start of each loading session
    displayRef.current = 0;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    function draw() {
      if (!ctx) return;
      // Lerp toward target progress (feels smooth instead of jumping)
      const target = progressRef.current;
      displayRef.current += (target - displayRef.current) * 0.09;
      if (Math.abs(target - displayRef.current) < 0.001) displayRef.current = target;
      const p = Math.min(1, displayRef.current);

      const W = BAR_W;
      const H = BAR_H;
      ctx.clearRect(0, 0, W, H);

      // ── Track background ────────────────────────────────────────────────────
      ctx.fillStyle = "#0a0c16";
      ctx.fillRect(0, 0, W, H);

      // ── Pixel-art outer border (1px, colour matches reference highlight) ────
      ctx.fillStyle = "#252a3a";
      ctx.fillRect(1, 0, W - 2, 1);     // top
      ctx.fillRect(1, H - 1, W - 2, 1); // bottom
      ctx.fillRect(0, 1, 1, H - 2);     // left
      ctx.fillRect(W - 1, 1, 1, H - 2); // right

      // ── Inner inset border ──────────────────────────────────────────────────
      ctx.fillStyle = "#14172200";
      ctx.fillRect(2, 2, W - 4, H - 4);

      // ── Fill bar ────────────────────────────────────────────────────────────
      const PAD  = 2;
      const innerW = W - PAD * 2;
      const innerH = H - PAD * 2;
      const fillW = Math.max(0, Math.floor(innerW * p));

      if (fillW > 0) {
        // Main gradient: deep purple → lavender → amber gold
        const grad = ctx.createLinearGradient(PAD, 0, PAD + innerW, 0);
        grad.addColorStop(0,    "#3b0764"); // deep purple
        grad.addColorStop(0.30, "#6d28d9"); // purple
        grad.addColorStop(0.62, "#a855f7"); // lavender
        grad.addColorStop(0.82, "#f59e0b"); // amber
        grad.addColorStop(1,    "#fbbf24"); // gold
        ctx.fillStyle = grad;
        ctx.fillRect(PAD, PAD, fillW, innerH);

        // Top-sheen pixel row (1px highlight inside fill — pixel art style)
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(PAD, PAD, fillW, 1);

        // Bottom shadow pixel row
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(PAD, PAD + innerH - 1, fillW, 1);

        // ── Glowing leading edge ──────────────────────────────────────────────
        if (p < 0.995) {
          const ex = PAD + fillW; // x of leading edge

          // Soft spread (4px)
          ctx.fillStyle = "rgba(251,191,36,0.18)";
          ctx.fillRect(Math.max(PAD, ex - 6), PAD, 5, innerH);

          // Medium spread (2px)
          ctx.fillStyle = "rgba(251,191,36,0.45)";
          ctx.fillRect(Math.max(PAD, ex - 3), PAD, 3, innerH);

          // Bright tip (1px white-gold)
          ctx.fillStyle = "rgba(255,245,180,0.92)";
          ctx.fillRect(Math.max(PAD, ex - 1), PAD, 2, innerH);
        }
      }

      // ── Corner dots (pixel art) ─────────────────────────────────────────────
      const dotColor = p > 0.05 ? "#7c3aed" : "#252a3a";
      ctx.fillStyle = dotColor;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillRect(W - 1, 0, 1, 1);
      ctx.fillRect(0, H - 1, 1, 1);
      ctx.fillRect(W - 1, H - 1, 1, 1);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]); // re-runs when visible toggles

  if (!visible) return null;

  return (
    <div
      style={{
        position        : "fixed",
        inset           : 0,
        zIndex          : 900,
        background      : "#06070d",
        display         : "flex",
        flexDirection   : "column",
        alignItems      : "center",
        justifyContent  : "center",
        fontFamily      : "'Segoe UI', 'Georgia', serif",
      }}
    >
      {/* Radial vignette backdrop */}
      <div
        style={{
          position   : "absolute",
          inset      : 0,
          pointerEvents: "none",
          background : "radial-gradient(ellipse 65% 65% at 50% 50%, transparent 20%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position   : "relative",
          background : "#111318",
          border     : "2px solid #252835",
          minWidth   : 360,
          padding    : "36px 40px 28px",
          boxShadow  : "0 0 0 1px #1a1c2a inset, 0 20px 56px rgba(0,0,0,0.92), 0 0 60px rgba(109,40,217,0.10)",
        }}
      >
        {/* Top pixel highlight strip — mimics the reference image edge glow */}
        <div
          style={{
            position  : "absolute",
            top       : 0,
            left      : 0,
            right     : 0,
            height    : 3,
            background: "linear-gradient(to right, #2a3050, #6a7a9a 40%, #8090b8 50%, #6a7a9a 60%, #2a3050)",
          }}
        />

        {/* Bottom subtle shadow strip */}
        <div
          style={{
            position  : "absolute",
            bottom    : 0,
            left      : 0,
            right     : 0,
            height    : 2,
            background: "linear-gradient(to right, transparent, #1a1c2a 30%, #1a1c2a 70%, transparent)",
          }}
        />

        {/* Corner ornament squares — pixel art bevel detail */}
        {(
          [
            { top: -2,    left:  -2 },
            { top: -2,    right: -2 },
            { bottom: -2, left:  -2 },
            { bottom: -2, right: -2 },
          ] as React.CSSProperties[]
        ).map((pos, i) => (
          <div
            key={i}
            style={{
              position  : "absolute",
              ...pos,
              width     : 6,
              height    : 6,
              background: "#4a5a78",
            }}
          />
        ))}

        {/* Decorative fantasy ornament row */}
        <div
          style={{
            textAlign    : "center",
            color        : "#3a4870",
            fontSize     : 18,
            letterSpacing: 10,
            marginBottom : 16,
            userSelect   : "none",
          }}
        >
          ✦ ✦ ✦
        </div>

        {/* "Memasuki" label */}
        <div
          style={{
            textAlign     : "center",
            color         : "#7a8aaa",
            fontSize      : 12,
            letterSpacing : 4,
            textTransform : "uppercase",
            marginBottom  : 8,
            userSelect    : "none",
          }}
        >
          Memasuki
        </div>

        {/* Map name */}
        <div
          style={{
            textAlign  : "center",
            color      : "#f5c842",
            fontSize   : 20,
            letterSpacing: 2,
            marginBottom: 28,
            userSelect  : "none",
            textShadow  : "0 0 24px rgba(245,200,66,0.45), 0 0 60px rgba(245,200,66,0.15)",
          }}
        >
          {mapName || "—"}
        </div>

        {/* ── Canvas Loading Bar ───────────────────────────────────────────── */}
        <canvas
          ref={canvasRef}
          width={BAR_W}
          height={BAR_H}
          style={{
            display        : "block",
            width          : "100%",
            height         : BAR_H,
            imageRendering : "pixelated",
          }}
        />

        {/* Progress percentage */}
        <div
          style={{
            textAlign    : "center",
            color        : "#3a4870",
            fontSize     : 11,
            letterSpacing: 2,
            marginTop    : 10,
            userSelect   : "none",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(progress * 100)}%
        </div>

        {/* Bottom ornament */}
        <div
          style={{
            textAlign    : "center",
            color        : "#1e2538",
            fontSize     : 14,
            letterSpacing: 8,
            marginTop    : 16,
            userSelect   : "none",
          }}
        >
          ✦ ✦ ✦
        </div>
      </div>
    </div>
  );
}
