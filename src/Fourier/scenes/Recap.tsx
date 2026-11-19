import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  useCurrentFrame,
} from "remotion";
import {
  BASELINE_STROKE,
  COLORS,
  COMPONENTS,
  HEIGHT,
  MAX_SUM_AMPLITUDE,
  PlotRect,
  WIDTH,
  captionStyle,
  componentValue,
  rowLabelStyle,
  subtitleStyle,
  sumValue,
  wavePath,
} from "../waves";

// Timeline (frames @ 30 fps), synced to scene10.wav (~8 s):
//   "any sound is a sum of sine waves" ~1.4-3.5 s,
//   "the Fourier transform tells us which ones" ~3.8 s, "how strong" ~6.6 s.
export const RECAP_DURATION = 300; // 10 s
const SUM_IN = [0, 12] as const;
const SPLIT = [20, 75] as const;
const BARS_GROW = [60, 105] as const;
const BAR_STAGGER = 8;
const LINE1_IN = [80, 100] as const;
const LINE2_IN = [115, 135] as const;
const FINAL_FADE = [276, 298] as const;

// Waves on the left, their spectrum bars on the right.
const WAVE_LEFT = 120;
const WAVE_WIDTH = 1120;
const PX_PER_UNIT = 62;
const ROW_CENTERS = [170, 330, 490];
const SUM_CENTER = ROW_CENTERS[1];

const BAR_BASE_Y = 560;
const BAR_X = [1430, 1580, 1730]; // bar centers, low -> high frequency
const BAR_WIDTH = 80;
/** Bar height for an amplitude of 1. */
const BAR_PX_PER_UNIT = 300;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const rowRect = (centerY: number): PlotRect => ({
  left: WAVE_LEFT,
  width: WAVE_WIDTH,
  centerY,
  halfHeight: PX_PER_UNIT * MAX_SUM_AMPLITUDE,
});

export const Recap: React.FC = () => {
  const frame = useCurrentFrame();

  const fade = interpolate(frame, FINAL_FADE, [1, 0], clamp);
  const sumIn = interpolate(frame, SUM_IN, [0, 1], clamp);
  const split = interpolate(frame, SPLIT, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const line1 = interpolate(frame, LINE1_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const line2 = interpolate(frame, LINE2_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        {/* Three copies of the white sum: each slides to its row while
            morphing into one clean sine and taking on its color. */}
        {COMPONENTS.map((c, i) => {
          const rect = rowRect(
            SUM_CENTER + (ROW_CENTERS[i] - SUM_CENTER) * split,
          );
          const f = (u: number) =>
            (1 - split) * sumValue(u) + split * componentValue(c, u);
          const color = interpolateColors(
            split,
            [0, 1],
            [COLORS.sum, COLORS.components[i]],
          );
          return (
            <g key={c.freq} opacity={sumIn * fade}>
              <line
                x1={rect.left}
                x2={rect.left + rect.width}
                y1={rect.centerY}
                y2={rect.centerY}
                stroke={COLORS.axis}
                strokeWidth={BASELINE_STROKE}
                opacity={i === 1 ? 1 : split}
              />
              <path
                d={wavePath(f, rect)}
                fill="none"
                stroke={color}
                strokeWidth={4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Spectrum: one bar per sine, at its frequency, as tall as it is strong. */}
        <line
          x1={BAR_X[0] - BAR_WIDTH}
          x2={BAR_X[2] + BAR_WIDTH}
          y1={BAR_BASE_Y}
          y2={BAR_BASE_Y}
          stroke={COLORS.axis}
          strokeWidth={BASELINE_STROKE}
          opacity={
            interpolate(
              frame,
              [BARS_GROW[0] - 10, BARS_GROW[0]],
              [0, 1],
              clamp,
            ) * fade
          }
        />
        {COMPONENTS.map((c, i) => {
          const grow = interpolate(
            frame,
            [BARS_GROW[0] + i * BAR_STAGGER, BARS_GROW[1] + i * BAR_STAGGER],
            [0, 1],
            { ...clamp, easing: Easing.out(Easing.cubic) },
          );
          const h = c.amp * BAR_PX_PER_UNIT * grow;
          return (
            <rect
              key={c.freq}
              x={BAR_X[i] - BAR_WIDTH / 2}
              y={BAR_BASE_Y - h}
              width={BAR_WIDTH}
              height={h}
              rx={6}
              fill={COLORS.components[i]}
              opacity={fade}
            />
          );
        })}
      </svg>

      {COMPONENTS.map((c, i) => (
        <div
          key={c.freq}
          style={{
            ...rowLabelStyle,
            fontSize: 30,
            position: "absolute",
            left: BAR_X[i] - 100,
            width: 200,
            top: BAR_BASE_Y + 16,
            textAlign: "center",
            color: COLORS.components[i],
            opacity:
              interpolate(
                frame,
                [
                  BARS_GROW[0] + i * BAR_STAGGER,
                  BARS_GROW[0] + i * BAR_STAGGER + 15,
                ],
                [0, 1],
                clamp,
              ) * fade,
          }}
        >
          {c.freq} Hz
        </div>
      ))}

      <div
        style={{
          ...captionStyle,
          position: "absolute",
          top: 720,
          width: "100%",
          opacity: line1 * fade,
          transform: `translateY(${(1 - line1) * 20}px)`,
        }}
      >
        Any sound = a sum of sine waves
      </div>
      <div
        style={{
          ...subtitleStyle,
          position: "absolute",
          top: 830,
          width: "100%",
          opacity: line2 * fade,
          transform: `translateY(${(1 - line2) * 16}px)`,
        }}
      >
        Fourier transform → which frequencies, how strong
      </div>
    </AbsoluteFill>
  );
};
