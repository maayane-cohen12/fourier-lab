import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BASELINE_STROKE,
  COLORS,
  HEIGHT,
  MAX_SUM_AMPLITUDE,
  PX_PER_UNIT,
  PlotRect,
  ROW_PLOT_LEFT,
  ROW_PLOT_WIDTH,
  SUM_OUTLINE_OPACITY,
  SUM_OUTLINE_STROKE,
  SUM_ROW_PLOT,
  WIDTH,
  captionStyle,
  rowLabelPosition,
  rowLabelStyle,
  sumValue,
  wavePath,
} from "../waves";

// Timeline (frames @ 30 fps), synced to scene3.wav (~11 s):
//   "a sine wave" ~2.4 s, "how fast it wiggles is its frequency" ~3.9 s,
//   "how tall it is, its amplitude" ~7.8 s.
// Frame 0 and the last frame are exactly MessyWave's last frame, so the cuts
// MessyWave -> WhatIsASine -> SumOfSines are invisible.
export const WHAT_IS_A_SINE_DURATION = 360; // 12 s
const SINE_IN = [50, 90] as const;
const FREQ_LABEL_IN = [112, 132] as const;
const SPEED_UP = [135, 210] as const;
const AMP_LABEL_IN = [228, 248] as const;
const GROW = [250, 310] as const;
const ALL_OUT = [318, 342] as const;

/** The sine sits above the Sum row, on the same x range as the scene rows. */
const SINE_RECT: PlotRect = {
  left: ROW_PLOT_LEFT,
  width: ROW_PLOT_WIDTH,
  centerY: 410,
  halfHeight: PX_PER_UNIT * MAX_SUM_AMPLITUDE,
};
const CYCLES = [2, 6] as const; // slow -> fast
const AMPLITUDE = [1, 1.9] as const; // short -> tall, in shared units
/** How far the wave travels per frame per cycle drawn, in plot widths. */
const TRAVEL = 0.0016;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const speedUpAt = (f: number) =>
  interpolate(f, SPEED_UP, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
const cyclesAt = (f: number) =>
  CYCLES[0] + (CYCLES[1] - CYCLES[0]) * speedUpAt(f);

/**
 * Phase travelled so far (in cycles). The wave moves at a speed proportional
 * to its frequency, so it visibly wiggles faster after speeding up.
 * Summed frame by frame so it stays continuous while the frequency changes.
 */
const phaseAt = (frame: number) => {
  let phase = 0;
  for (let f = 0; f < frame; f++) {
    phase += TRAVEL * cyclesAt(f) * cyclesAt(f);
  }
  return phase;
};

/** Exactly what MessyWave renders on its last frame. */
const MessyWaveEndFrame: React.FC = () => (
  <>
    <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
      <line
        x1={SUM_ROW_PLOT.left}
        x2={SUM_ROW_PLOT.left + SUM_ROW_PLOT.width}
        y1={SUM_ROW_PLOT.centerY}
        y2={SUM_ROW_PLOT.centerY}
        stroke={COLORS.axis}
        strokeWidth={BASELINE_STROKE}
      />
      <path
        d={wavePath(sumValue, SUM_ROW_PLOT)}
        fill="none"
        stroke={COLORS.sum}
        strokeWidth={SUM_OUTLINE_STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={SUM_OUTLINE_OPACITY}
      />
    </svg>
    <div
      style={{ ...rowLabelStyle, ...rowLabelPosition(SUM_ROW_PLOT.centerY) }}
    >
      Sum
    </div>
  </>
);

export const WhatIsASine: React.FC = () => {
  const frame = useCurrentFrame();

  const allOut = interpolate(frame, ALL_OUT, [1, 0], clamp);
  const sineIn = interpolate(frame, SINE_IN, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const freqLabel = interpolate(frame, FREQ_LABEL_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const ampLabel = interpolate(frame, AMP_LABEL_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const amplitude = interpolate(frame, GROW, AMPLITUDE, {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const cycles = cyclesAt(frame);
  const phase = phaseAt(frame);
  const sine = (u: number) =>
    amplitude * Math.sin(2 * Math.PI * (cycles * u - phase));

  const sineOpacity = sineIn * allOut;
  const color = COLORS.components[0];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <MessyWaveEndFrame />

      {sineOpacity > 0 ? (
        <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
          <line
            x1={SINE_RECT.left}
            x2={SINE_RECT.left + SINE_RECT.width}
            y1={SINE_RECT.centerY}
            y2={SINE_RECT.centerY}
            stroke={COLORS.axis}
            strokeWidth={BASELINE_STROKE}
            opacity={sineOpacity}
          />
          <path
            d={wavePath(sine, SINE_RECT, 0, sineIn)}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={sineOpacity}
          />
        </svg>
      ) : null}

      <Label top={70} t={freqLabel} opacity={allOut}>
        <span style={{ color }}>frequency</span> → pitch
      </Label>
      <Label top={150} t={ampLabel} opacity={allOut}>
        <span style={{ color }}>amplitude</span> → loudness
      </Label>
    </AbsoluteFill>
  );
};

const Label: React.FC<{
  top: number;
  t: number;
  opacity: number;
  children: React.ReactNode;
}> = ({ top, t, opacity, children }) =>
  t * opacity > 0 ? (
    <div
      style={{
        ...captionStyle,
        position: "absolute",
        top,
        width: "100%",
        opacity: t * opacity,
        transform: `translateY(${(1 - t) * 16}px)`,
      }}
    >
      {children}
    </div>
  ) : null;
