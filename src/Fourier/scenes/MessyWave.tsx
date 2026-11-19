import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BASELINE_STROKE,
  COLORS,
  GLOW_BLUR,
  FULLSCREEN_PLOT,
  HEIGHT,
  SUM_OUTLINE_OPACITY,
  SUM_OUTLINE_STROKE,
  SUM_ROW_PLOT,
  WIDTH,
  lerpRect,
  plotPoint,
  rowLabelPosition,
  rowLabelStyle,
  subtitleStyle,
  sumValue,
  titleStyle,
  wavePath,
} from "../waves";

// Timeline (frames @ 30 fps)
export const MESSY_WAVE_DURATION = 300; // ~10 s
const SUBTITLE_IN = 150; // 5 s
const SLOW_START = 180; // start decelerating
const STOP = 225; // wave at rest, exactly in scene-2 shape
const TEXT_OUT = [228, 245] as const;
const SHRINK = [240, 280] as const;
const DIM = [278, 296] as const;

const SPEED = 0.01; // plot widths per frame while scrolling
const SAMPLES_PER_PLOT = 96;

/**
 * Distance scrolled so far. Constant speed, then a linear deceleration to 0.
 * Returned relative to the stopping point, so at STOP the shift is exactly 0
 * and the curve is identical to the scene-2 Sum row.
 */
const scrollShift = (frame: number): number => {
  const slowLen = STOP - SLOW_START;
  const distance = (f: number) => {
    if (f <= SLOW_START) return SPEED * f;
    const s = Math.min(f, STOP) - SLOW_START;
    return SPEED * SLOW_START + SPEED * s - (SPEED * s * s) / (2 * slowLen);
  };
  return distance(frame) - distance(STOP);
};

export const MessyWave: React.FC = () => {
  const frame = useCurrentFrame();

  const shift = scrollShift(frame);

  const shrinkT = interpolate(frame, SHRINK, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const rect = lerpRect(FULLSCREEN_PLOT, SUM_ROW_PLOT, shrinkT);

  const dimT = interpolate(frame, DIM, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const waveOpacity = interpolate(dimT, [0, 1], [1, SUM_OUTLINE_OPACITY]);
  const strokeWidth = interpolate(
    shrinkT + dimT,
    [0, 1, 2],
    [5, 4, SUM_OUTLINE_STROKE],
  );
  const glow = interpolate(dimT, [0, 1], [1, 0]);

  const titleOpacity =
    interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }) *
    interpolate(frame, TEXT_OUT, [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const subtitleOpacity =
    interpolate(frame, [SUBTITLE_IN, SUBTITLE_IN + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(frame, TEXT_OUT, [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const subtitleY = interpolate(
    frame,
    [SUBTITLE_IN, SUBTITLE_IN + 20],
    [16, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  // Faint sample points ride along with the wave content.
  const sampleOpacity =
    0.6 *
    interpolate(frame, [SHRINK[0] - 15, SHRINK[0] + 10], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const samples: { x: number; y: number }[] = [];
  if (sampleOpacity > 0) {
    const first = Math.ceil(shift * SAMPLES_PER_PLOT);
    const last = Math.floor((shift + 1) * SAMPLES_PER_PLOT);
    for (let k = first; k <= last; k++) {
      const content = k / SAMPLES_PER_PLOT;
      samples.push(plotPoint(rect, content - shift, sumValue(content)));
    }
  }

  // Scene-2 Sum row furniture fades in as the wave lands.
  const rowOpacity = interpolate(
    frame,
    [SHRINK[1] - 15, SHRINK[1] + 10],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const path = wavePath(sumValue, rect, shift);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        <defs>
          <filter id="glow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation={GLOW_BLUR} />
          </filter>
        </defs>

        {/* baseline */}
        <line
          x1={rect.left}
          x2={rect.left + rect.width}
          y1={rect.centerY}
          y2={rect.centerY}
          stroke={COLORS.axis}
          strokeWidth={BASELINE_STROKE}
        />

        {/* sample stems: each stored number, measured from the baseline */}
        {samples.map((p, i) => (
          <line
            key={i}
            x1={p.x}
            x2={p.x}
            y1={rect.centerY}
            y2={p.y}
            stroke={COLORS.sample}
            strokeWidth={1.5}
            opacity={sampleOpacity * 0.35}
          />
        ))}

        {/* glow + wave */}
        <path
          d={path}
          fill="none"
          stroke={COLORS.sum}
          strokeWidth={strokeWidth * 3}
          opacity={0.35 * glow}
          filter="url(#glow)"
        />
        <path
          d={path}
          fill="none"
          stroke={COLORS.sum}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={waveOpacity}
        />
        {/* sample points on top of the wave */}
        {samples.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={COLORS.sample}
            opacity={sampleOpacity}
          />
        ))}
      </svg>

      {/* Sum row label (scene 2 position) */}
      <div
        style={{
          ...rowLabelStyle,
          ...rowLabelPosition(SUM_ROW_PLOT.centerY),
          opacity: rowOpacity,
        }}
      >
        Sum
      </div>

      {/* Titles */}
      <div
        style={{
          position: "absolute",
          top: 70,
          width: "100%",
          ...titleStyle,
          opacity: titleOpacity,
        }}
      >
        This is what sound looks like to a computer
      </div>
      <div
        style={{
          position: "absolute",
          top: 170,
          width: "100%",
          ...subtitleStyle,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        Looks like chaos… but there is a hidden pattern
      </div>
    </AbsoluteFill>
  );
};
