import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  COLORS,
  HEIGHT,
  MAX_SUM_AMPLITUDE,
  PlotRect,
  WIDTH,
  subtitleStyle,
  titleStyle,
  wavePath,
} from "../waves";

// Timeline (frames @ 30 fps). Narration (scene1.wav) is ~6.8 s; the subtitle
// lands on "how a computer takes a sound apart" (~4.3 s).
export const INTRO_DURATION = 240; // 8 s
const TITLE_IN = [8, 32] as const;
const WAVE_DRAW = [24, 84] as const;
const SUBTITLE_IN = [126, 146] as const;
const FADE_OUT = [214, 236] as const;

/** The small sine under the title, in pixels. */
const WAVE_RECT: PlotRect = {
  left: (WIDTH - 640) / 2,
  width: 640,
  centerY: 560,
  halfHeight: 36,
};
const WAVE_CYCLES = 3;
/** Plot widths per frame the small sine drifts, so it feels alive. */
const WAVE_DRIFT = 0.004;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * A unit sine. wavePath maps MAX_SUM_AMPLITUDE to rect.halfHeight, so scale
 * by it to make the peaks exactly halfHeight tall.
 */
const sine = (u: number) =>
  MAX_SUM_AMPLITUDE * Math.sin(2 * Math.PI * WAVE_CYCLES * u);

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(frame, FADE_OUT, [1, 0], clamp);

  const titleT = interpolate(frame, TITLE_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const drawT = interpolate(frame, WAVE_DRAW, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const subtitleT = interpolate(frame, SUBTITLE_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const shift = -WAVE_DRIFT * frame;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <div
        style={{
          ...titleStyle,
          fontSize: 104,
          position: "absolute",
          top: 330,
          width: "100%",
          opacity: titleT * fadeOut,
          transform: `translateY(${(1 - titleT) * 24}px)`,
        }}
      >
        The Fourier Transform
      </div>

      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        {drawT > 0 ? (
          <path
            d={wavePath(sine, WAVE_RECT, shift, drawT)}
            fill="none"
            stroke={COLORS.sum}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={fadeOut}
          />
        ) : null}
      </svg>

      <div
        style={{
          ...subtitleStyle,
          position: "absolute",
          top: 660,
          width: "100%",
          opacity: subtitleT * fadeOut,
          transform: `translateY(${(1 - subtitleT) * 16}px)`,
        }}
      >
        How a computer takes a sound apart
      </div>
    </AbsoluteFill>
  );
};
