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
  COMPONENT_ROW_PLOTS,
  COMPONENT_STROKE,
  GLOW_BLUR,
  HEIGHT,
  SUM_GLOW_OPACITY,
  SUM_GLOW_STROKE,
  SUM_ROW_PLOT,
  SUM_STROKE_GLOWING,
  WIDTH,
  componentValue,
  rowLabelPosition,
  rowLabelStyle,
  subtitleStyle,
  sumValue,
  titleStyle,
  wavePath,
} from "../waves";

// Timeline (frames @ 30 fps)
export const SPLIT_BACK_DURATION = 360; // ~12 s
const TITLE_IN = [12, 36] as const;
const TITLE_OUT = [92, 108] as const;
/** One peel per component, lowest frequency first. */
const PEEL_LENGTH = 55;
const PEEL_STARTS = [105, 175, 245];
const FLAT_FADE = [305, 328] as const;
const LABEL_FADE = 15; // label + row baseline fade in as each sine lands

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** What is left of the sum after removing the first k components. */
const residual = (k: number) => (u: number) =>
  COMPONENTS.slice(0, k).reduce(
    (acc, c) => acc - componentValue(c, u),
    sumValue(u),
  );

export const SplitBack: React.FC = () => {
  const frame = useCurrentFrame();

  // Per component: how far it has risen (0 = in the Sum row, 1 = in its row)
  // and how far it has morphed from "copy of the white wave" into a clean sine.
  const peels = PEEL_STARTS.map((start) => {
    const rise = interpolate(frame, [start, start + PEEL_LENGTH], [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
    // The shape change lags the lift a little, so the copy is visibly the
    // white wave as it leaves.
    const morph = interpolate(
      frame,
      [start + PEEL_LENGTH * 0.2, start + PEEL_LENGTH],
      [0, 1],
      { ...clamp, easing: Easing.inOut(Easing.quad) },
    );
    const label = interpolate(
      frame,
      [start + PEEL_LENGTH - LABEL_FADE, start + PEEL_LENGTH],
      [0, 1],
      clamp,
    );
    return { started: frame >= start, rise, morph, label };
  });

  // The white wave: the residual minus whatever is currently being pulled out.
  const activeIndex = peels.findIndex((p) => p.morph < 1);
  const peeledCount = activeIndex === -1 ? COMPONENTS.length : activeIndex;
  const whiteWave = (u: number) => {
    const base = residual(peeledCount)(u);
    if (activeIndex === -1) return base;
    return (
      base -
      peels[activeIndex].morph * componentValue(COMPONENTS[activeIndex], u)
    );
  };

  const flatFade = interpolate(frame, FLAT_FADE, [1, 0], clamp);

  const titleT =
    interpolate(frame, TITLE_IN, [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }) * interpolate(frame, TITLE_OUT, [1, 0], clamp);
  const titleY = interpolate(frame, TITLE_IN, [20, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const whitePath = wavePath(whiteWave, SUM_ROW_PLOT);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        <defs>
          <filter id="sumGlow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation={GLOW_BLUR} />
          </filter>
        </defs>

        {/* row baselines appear as each sine lands */}
        {COMPONENT_ROW_PLOTS.map((rect, i) => (
          <line
            key={COMPONENTS[i].freq}
            x1={rect.left}
            x2={rect.left + rect.width}
            y1={rect.centerY}
            y2={rect.centerY}
            stroke={COLORS.axis}
            strokeWidth={BASELINE_STROKE}
            opacity={peels[i].label}
          />
        ))}

        {/* ---------- the white wave: what is left of the sum ---------- */}
        <g opacity={flatFade}>
          <line
            x1={SUM_ROW_PLOT.left}
            x2={SUM_ROW_PLOT.left + SUM_ROW_PLOT.width}
            y1={SUM_ROW_PLOT.centerY}
            y2={SUM_ROW_PLOT.centerY}
            stroke={COLORS.axis}
            strokeWidth={BASELINE_STROKE}
          />
          <path
            d={whitePath}
            fill="none"
            stroke={COLORS.sum}
            strokeWidth={SUM_GLOW_STROKE}
            opacity={SUM_GLOW_OPACITY}
            filter="url(#sumGlow)"
          />
          <path
            d={whitePath}
            fill="none"
            stroke={COLORS.sum}
            strokeWidth={SUM_STROKE_GLOWING}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>

        {/* ---------- peeled components ---------- */}
        {COMPONENTS.map((c, i) => {
          const p = peels[i];
          if (!p.started) return null;
          const from = residual(i);
          const shape = (u: number) =>
            (1 - p.morph) * from(u) + p.morph * componentValue(c, u);
          const rect = {
            ...SUM_ROW_PLOT,
            centerY: interpolate(
              p.rise,
              [0, 1],
              [SUM_ROW_PLOT.centerY, COMPONENT_ROW_PLOTS[i].centerY],
            ),
          };
          return (
            <path
              key={c.freq}
              d={wavePath(shape, rect)}
              fill="none"
              stroke={interpolateColors(
                p.morph,
                [0, 1],
                [COLORS.sum, COLORS.components[i]],
              )}
              strokeWidth={interpolate(
                p.morph,
                [0, 1],
                [SUM_STROKE_GLOWING, COMPONENT_STROKE],
              )}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* ---------- labels ---------- */}
      {COMPONENTS.map((c, i) => (
        <div
          key={c.freq}
          style={{
            ...rowLabelStyle,
            ...rowLabelPosition(COMPONENT_ROW_PLOTS[i].centerY),
            color: COLORS.components[i],
            opacity: peels[i].label,
          }}
        >
          {c.freq} Hz
        </div>
      ))}

      {/* ---------- title ---------- */}
      <div
        style={{
          position: "absolute",
          top: 300,
          width: "100%",
          opacity: titleT,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={titleStyle}>The Fourier transform</div>
        <div style={{ ...subtitleStyle, marginTop: 16 }}>does the reverse</div>
      </div>
    </AbsoluteFill>
  );
};
