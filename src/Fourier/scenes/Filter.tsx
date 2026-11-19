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
import { Spectrum } from "./Spectrum";
import { useSceneTiming } from "../narration/NarrationContext";
import { MIN_CAPTION_FRAMES, checkCaptionHold } from "../narration/timing";

// Timeline (frames @ 30 fps), synced to scene8.wav: the 660 Hz bar shrinks
// from "one bar" through "and the sound changes"; "Remove a frequency = a
// filter" arrives just before "That is how filters work"; the closing line
// comes in on "any sound"; the last 0.6 s fades to the empty background.
const GHOST_FADE = 10; // dashed "before" outlines
const CAPTION_FADE = 14;
const CAPTION_LEAD = 3; // caption is fully in this long before "That is…"
const CLOSING_FADE = 20;
const SWAP = 12; // caption fades out over this, ending as the closing line starts
const FINAL_FADE_LENGTH = 18; // last 0.6 s; reaches 0 on the final frame
const CAPTION = "Remove a frequency = a filter";
const CLOSING = "Any sound = a sum of sine waves";

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
  const timing = useSceneTiming("Filter");
  const spectrumEnd = useSceneTiming("Spectrum").durationInFrames - 1;
  const E = timing.durationInFrames;

  const REMOVE = [
    timing.cue("one bar").start,
    timing.cue("and the sound changes").end,
  ];
  const GHOST_IN = [REMOVE[0], REMOVE[0] + GHOST_FADE];
  const closingAt = timing.cue("any sound").start;
  const CLOSING_IN = [closingAt, closingAt + CLOSING_FADE];
  const CAPTION_OUT = [closingAt - SWAP, closingAt];
  // Fully in just before "That is how filters work", and early enough to
  // stay fully visible for the minimum hold before the closing line.
  const captionFull = Math.min(
    timing.cue("That is how filters work").start - CAPTION_LEAD,
    CAPTION_OUT[0] - MIN_CAPTION_FRAMES,
  );
  const CAPTION_IN = [captionFull - CAPTION_FADE, captionFull];
  const FINAL_FADE = [E - FINAL_FADE_LENGTH, E - 1];
  checkCaptionHold("Filter", CAPTION, CAPTION_IN[1], CAPTION_OUT[0]);
  checkCaptionHold("Filter", CLOSING, CLOSING_IN[1], FINAL_FADE[0]);

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
        <Freeze frame={spectrumEnd}>
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
          {CAPTION}
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
          {CLOSING}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
