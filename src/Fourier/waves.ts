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
  sum: "#ffffff", // the sum wave, in every scene (full, outline and trace)
  sample: "#ffd479",
  scan: "#c9d6f5",
  // 220, 440, 660 Hz
  components: ["#4d9fff", "#ff9f43", "#ff6fb5"],
  // HowItFinds: the test sine, and product area above / below zero
  test: "#7fe3ff",
  areaPositive: "#5fe3a1",
  areaNegative: "#ff6b6b",
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

export const captionStyle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  color: COLORS.text,
  fontSize: 56,
  fontWeight: 700,
  textAlign: "center",
};

/** Blur radius of the glow under a highlighted wave. */
export const GLOW_BLUR = 8;
export const BASELINE_STROKE = 2;

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

/**
 * A plot rectangle: x range [left, left + width], wave centered on centerY.
 * halfHeight is the pixel height of MAX_SUM_AMPLITUDE, so two rects with the
 * same halfHeight share one vertical scale.
 */
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

/**
 * Scene 2 layout: three component rows above the Sum row, sharing x range
 * and ONE vertical scale (PX_PER_UNIT), so values can be compared and
 * stacked across rows.
 */
export const PX_PER_UNIT = 77;
export const ROW_HALF_HEIGHT = PX_PER_UNIT * MAX_SUM_AMPLITUDE;
export const ROW_PLOT_LEFT = 300;
export const ROW_PLOT_WIDTH = WIDTH - ROW_PLOT_LEFT - 100;
export const ROW_LABEL_X = 80;
/** Center x of the "+" / "=" operator column, left of the labels. */
export const OPERATOR_X = 48;

export const ROW_CENTERS = {
  components: [200, 350, 490],
  sum: 750,
} as const;
/** Divider line between the last component row and the Sum row. */
export const DIVIDER_Y = 590;

export const rowRect = (centerY: number): PlotRect => ({
  left: ROW_PLOT_LEFT,
  width: ROW_PLOT_WIDTH,
  centerY,
  halfHeight: ROW_HALF_HEIGHT,
});

export const SUM_ROW_PLOT = rowRect(ROW_CENTERS.sum);
export const COMPONENT_ROW_PLOTS = ROW_CENTERS.components.map(rowRect);

/** Position of a row label, vertically centered on the row. */
export const rowLabelPosition = (centerY: number): React.CSSProperties => ({
  position: "absolute",
  left: ROW_LABEL_X,
  top: centerY,
  transform: "translateY(-50%)",
});

/** Opacity of the Sum wave once it has settled as a faint outline in scene 2. */
export const SUM_OUTLINE_OPACITY = 0.28;
export const SUM_OUTLINE_STROKE = 3;

/** Stroke of the solid sum wave; it thickens slightly while glowing. */
export const SUM_STROKE = 4;
export const SUM_STROKE_GLOWING = 5;
/** Blurred halo drawn under the glowing sum wave. */
export const SUM_GLOW_STROKE = 14;
export const SUM_GLOW_OPACITY = 0.55;

/** Stroke of each clean component sine. */
export const COMPONENT_STROKE = 4;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * SVG path for f(u + shift) over the plot, u in [0, uEnd] (uEnd < 1 draws
 * the wave in partially, left to right).
 * f is assumed scaled so MAX_SUM_AMPLITUDE maps to rect.halfHeight.
 */
export const wavePath = (
  f: (u: number) => number,
  rect: PlotRect,
  shift = 0,
  uEnd = 1,
  stepsPerPlot = 600,
): string => {
  const k = rect.halfHeight / MAX_SUM_AMPLITUDE;
  const steps = Math.max(1, Math.ceil(stepsPerPlot * uEnd));
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * uEnd;
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

/** SVG path for f over the plot, closed back along the baseline (for fills). */
export const areaPath = (
  f: (u: number) => number,
  rect: PlotRect,
  uEnd = 1,
  stepsPerPlot = 600,
): string => {
  const line = wavePath(f, rect, 0, uEnd, stepsPerPlot);
  const xEnd = rect.left + uEnd * rect.width;
  return `${line}L${xEnd.toFixed(2)},${rect.centerY}L${rect.left},${rect.centerY}Z`;
};

// ---------------------------------------------------------------------------
// HowItFinds: compare the sum with a test sine
// ---------------------------------------------------------------------------

/** A test sine at `freq` Hz, using the same cycles-per-plot mapping (220 Hz = 2). */
export const testSine =
  (freq: number, phase: number) =>
  (u: number): number =>
    Math.sin(2 * Math.PI * (freq / 110) * u + phase);

/**
 * Score of a test sine against the sum over u in [0, uEnd]: twice the
 * average of their product over the whole plot. For a test that matches a
 * component in frequency and phase, the full score is that component's
 * amplitude; for a non-matching one it is close to zero.
 */
export const productScore = (
  test: (u: number) => number,
  uEnd = 1,
  steps = 600,
): number => {
  const n = Math.max(1, Math.round(steps * uEnd));
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const u = ((i + 0.5) / n) * uEnd;
    acc += sumValue(u) * test(u);
  }
  return (2 * acc * uEnd) / n;
};

/** Analysis plots sit below the dimmed component rows, leaving room for the meter. */
export const ANALYSIS_PX_PER_UNIT = 60;
export const ANALYSIS_PLOT_WIDTH = 1300;

const analysisRect = (centerY: number): PlotRect => ({
  left: ROW_PLOT_LEFT,
  width: ANALYSIS_PLOT_WIDTH,
  centerY,
  halfHeight: ANALYSIS_PX_PER_UNIT * MAX_SUM_AMPLITUDE,
});

/** Sum wave with the test sine laid over it. */
export const COMPARE_PLOT = analysisRect(660);
/** Their product, with the area to zero shaded. */
export const PRODUCT_PLOT = analysisRect(900);

/** Vertical "score" meter to the right of the analysis plots. */
export const METER = {
  x: 1720,
  width: 44,
  top: 600,
  zeroY: 940,
  /** Score that fills the meter to the top. */
  max: 0.7,
} as const;

// ---------------------------------------------------------------------------
// Spectrum: one bar per component on a frequency axis
// ---------------------------------------------------------------------------

export const SPECTRUM = {
  /** Frequency axis: 0 Hz at axisLeft, maxFreq at axisRight. */
  axisLeft: 400,
  axisRight: 1700,
  maxFreq: 880,
  baseY: 900,
  /** Bar height for an amplitude of 1 (bar height = amplitude). */
  pxPerAmp: 400,
  /** Top of the strength axis, in amplitude units. */
  maxAmp: 1.1,
  barWidth: 80,
  barRadius: 6,
} as const;

export const freqToX = (freq: number): number =>
  SPECTRUM.axisLeft +
  (freq / SPECTRUM.maxFreq) * (SPECTRUM.axisRight - SPECTRUM.axisLeft);

export const ampToY = (amp: number): number =>
  SPECTRUM.baseY - amp * SPECTRUM.pxPerAmp;

/** The sound (sum wave) shown above the spectrum. */
export const SPECTRUM_SOUND_PLOT: PlotRect = {
  left: ROW_PLOT_LEFT,
  width: ROW_PLOT_WIDTH,
  centerY: 210,
  halfHeight: 45 * MAX_SUM_AMPLITUDE,
};
