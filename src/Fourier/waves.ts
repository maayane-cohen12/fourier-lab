// Shared wave math, plot layout and styles for every Fourier scene.

import type React from "react";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export const COLORS = {
  background: "#0b1530",
  text: "#e8eefc",
  textDim: "#8fa0c8",
  axis: "#2a3a66",
  sum: "#7fe3ff",
  sample: "#ffd479",
  components: ["#ff7a8a", "#8cf29a", "#b79bff"],
} as const;

export const FONT_FAMILY =
  '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

export const titleStyle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  color: COLORS.text,
  fontSize: 64,
  fontWeight: 700,
  letterSpacing: -0.5,
  textAlign: "center",
};

export const subtitleStyle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  color: COLORS.textDim,
  fontSize: 44,
  fontWeight: 500,
  textAlign: "center",
};

export const rowLabelStyle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  color: COLORS.textDim,
  fontSize: 36,
  fontWeight: 600,
};

// ---------------------------------------------------------------------------
// Wave math
// ---------------------------------------------------------------------------

export type Component = {
  freq: number; // Hz (for labels)
  amp: number;
  phase: number; // radians
  cycles: number; // cycles drawn across one plot width
};

export const COMPONENTS: Component[] = [
  { freq: 220, amp: 1, phase: 0.0, cycles: 2 },
  { freq: 440, amp: 0.6, phase: 0.5, cycles: 4 },
  { freq: 660, amp: 0.35, phase: 1.1, cycles: 6 },
];

/** Largest possible |sum|, used to scale plots so nothing clips. */
export const MAX_SUM_AMPLITUDE = COMPONENTS.reduce((a, c) => a + c.amp, 0);

/** One component at normalized plot position u (0 = left edge, 1 = right edge). */
export const componentValue = (c: Component, u: number): number =>
  c.amp * Math.sin(2 * Math.PI * c.cycles * u + c.phase);

/** The sum wave at normalized plot position u. Periodic in u with period 1. */
export const sumValue = (u: number): number =>
  COMPONENTS.reduce((acc, c) => acc + componentValue(c, u), 0);

// ---------------------------------------------------------------------------
// Plot layout
// ---------------------------------------------------------------------------

/** A plot rectangle: x range [left, left + width], wave centered on centerY. */
export type PlotRect = {
  left: number;
  width: number;
  centerY: number;
  /** Pixels for an amplitude of MAX_SUM_AMPLITUDE. */
  halfHeight: number;
};

export const lerpRect = (a: PlotRect, b: PlotRect, t: number): PlotRect => ({
  left: a.left + (b.left - a.left) * t,
  width: a.width + (b.width - a.width) * t,
  centerY: a.centerY + (b.centerY - a.centerY) * t,
  halfHeight: a.halfHeight + (b.halfHeight - a.halfHeight) * t,
});

/** Scene 1: the sum wave filling the screen. */
export const FULLSCREEN_PLOT: PlotRect = {
  left: 80,
  width: WIDTH - 160,
  centerY: 610,
  halfHeight: 300,
};

/** Scene 2 layout: three component rows and the Sum row, sharing x range. */
export const ROW_PLOT_LEFT = 300;
export const ROW_PLOT_WIDTH = WIDTH - ROW_PLOT_LEFT - 100;
export const ROW_HALF_HEIGHT = 80;
export const ROW_LABEL_X = 80;

export const ROW_CENTERS = {
  c220: 210,
  c440: 420,
  c660: 630,
  sum: 880,
} as const;

export const rowRect = (centerY: number): PlotRect => ({
  left: ROW_PLOT_LEFT,
  width: ROW_PLOT_WIDTH,
  centerY,
  halfHeight: ROW_HALF_HEIGHT,
});

export const SUM_ROW_PLOT = rowRect(ROW_CENTERS.sum);

/** Opacity of the Sum wave once it has settled as a faint outline in scene 2. */
export const SUM_OUTLINE_OPACITY = 0.28;
export const SUM_OUTLINE_STROKE = 3;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * SVG path for f(u + shift) over the plot, u in [0, 1].
 * f is assumed scaled so MAX_SUM_AMPLITUDE maps to rect.halfHeight.
 */
export const wavePath = (
  f: (u: number) => number,
  rect: PlotRect,
  shift = 0,
  steps = 600,
): string => {
  const k = rect.halfHeight / MAX_SUM_AMPLITUDE;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = rect.left + u * rect.width;
    const y = rect.centerY - f(u + shift) * k;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d;
};

/** Screen coordinates of a point on the plot. */
export const plotPoint = (
  rect: PlotRect,
  u: number,
  value: number,
): { x: number; y: number } => ({
  x: rect.left + u * rect.width,
  y: rect.centerY - value * (rect.halfHeight / MAX_SUM_AMPLITUDE),
});
