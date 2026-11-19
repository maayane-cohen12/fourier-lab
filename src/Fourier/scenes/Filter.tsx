import React from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  COLORS,
  COMPONENTS,
  HEIGHT,
  SPECTRUM,
  SPECTRUM_SOUND_PLOT,
  WIDTH,
  ampToY,
  captionStyle,
  freqToX,
  sumValue,
  titleStyle,
  wavePath,
} from "../waves";
import { SPECTRUM_DURATION, Spectrum } from "./Spectrum";

// Timeline (frames @ 30 fps)
export const FILTER_DURATION = 300; // ~10 s
const HOLD = 30; // 1 s of the untouched spectrum and wave
const REMOVE = [HOLD, HOLD + 45] as const; // 660 Hz bar shrinks away over 1.5 s
const GHOST_IN = [HOLD, HOLD + 10] as const; // dashed "before" outlines
const CAPTION_IN = [85, 105] as const;
const CAPTION_OUT = [165, 180] as const;
const CLOSING_IN = [186, 212] as const;
// Last 0.6 s; reaches the empty background on the final frame.
const FINAL_FADE = [FILTER_DURATION - 18, FILTER_DURATION - 1] as const;

/** Which component is filtered out (660 Hz). */
const REMOVED = 2;

/** Vertical center of the captions: the gap between the Sound wave and the chart. */
const CAPTION_Y = 350;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const Filter: React.FC = () => {
  const frame = useCurrentFrame();

  const removed = interpolate(frame, REMOVE, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const gains = COMPONENTS.map((_, i) => (i === REMOVED ? 1 - removed : 1));

  const ghost = interpolate(frame, GHOST_IN, [0, 1], clamp);
  const caption =
    interpolate(frame, CAPTION_IN, [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }) * interpolate(frame, CAPTION_OUT, [1, 0], clamp);
  const closing = interpolate(frame, CLOSING_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const fadeAll = interpolate(frame, FINAL_FADE, [1, 0], clamp);

  const removedComp = COMPONENTS[REMOVED];
  const barX = freqToX(removedComp.freq) - SPECTRUM.barWidth / 2;
  const barTop = ampToY(removedComp.amp);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <AbsoluteFill style={{ opacity: fadeAll }}>
        {/* The finished Spectrum chart, with the 660 Hz gain turned down. */}
        <Freeze frame={SPECTRUM_DURATION - 1}>
          <Spectrum gains={gains} />
        </Freeze>

        {/* ---------- dashed "before" outlines for comparison ---------- */}
        {ghost > 0 ? (
          <svg
            width={WIDTH}
            height={HEIGHT}
            style={{ position: "absolute" }}
            opacity={ghost}
          >
            <path
              d={wavePath(sumValue, SPECTRUM_SOUND_PLOT)}
              fill="none"
              stroke={COLORS.sum}
              strokeWidth={2.5}
              strokeDasharray="8 8"
              opacity={0.45}
            />
            <rect
              x={barX}
              y={barTop}
              width={SPECTRUM.barWidth}
              height={SPECTRUM.baseY - barTop}
              rx={SPECTRUM.barRadius}
              fill="none"
              stroke={COLORS.components[REMOVED]}
              strokeWidth={3}
              strokeDasharray="8 7"
              opacity={0.8}
            />
          </svg>
        ) : null}

        {/* ---------- captions ---------- */}
        <div
          style={{
            ...captionStyle,
            position: "absolute",
            width: "100%",
            top: CAPTION_Y,
            transform: `translateY(calc(-50% + ${(1 - caption) * 16}px))`,
            opacity: caption,
          }}
        >
          Remove a frequency = a filter
        </div>
        <div
          style={{
            ...titleStyle,
            position: "absolute",
            width: "100%",
            top: CAPTION_Y,
            transform: `translateY(calc(-50% + ${(1 - closing) * 16}px))`,
            opacity: closing,
          }}
        >
          Any sound = a sum of sine waves
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
