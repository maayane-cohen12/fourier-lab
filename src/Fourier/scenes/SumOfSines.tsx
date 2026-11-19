import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BASELINE_STROKE,
  COLORS,
  COMPONENTS,
  COMPONENT_STROKE,
  COMPONENT_ROW_PLOTS,
  DIVIDER_Y,
  GLOW_BLUR,
  HEIGHT,
  OPERATOR_X,
  PX_PER_UNIT,
  ROW_LABEL_X,
  ROW_PLOT_LEFT,
  ROW_PLOT_WIDTH,
  SUM_OUTLINE_OPACITY,
  SUM_GLOW_OPACITY,
  SUM_GLOW_STROKE,
  SUM_OUTLINE_STROKE,
  SUM_STROKE,
  SUM_STROKE_GLOWING,
  SUM_ROW_PLOT,
  WIDTH,
  captionStyle,
  componentValue,
  rowLabelPosition,
  rowLabelStyle,
  sumValue,
  wavePath,
} from "../waves";
import { useSceneTiming } from "../narration/NarrationContext";
import { checkCaptionHold } from "../narration/timing";

// Timeline (frames @ 30 fps), synced to scene4.wav:
//   each sine draws in on its note ("a low note", "a middle note", "a high
//   note"); the scan sweep runs from "Add them together" to the end of
//   "messy wave"; the sines dim, the sum glows and the caption appears on
//   "that messy wave"; the last 0.6 s fades all but the sum wave.
const NOTE_CUES = ["a low note", "a middle note", "a high note"];
const DRAW_LENGTH = 36;
const OPERATORS_LENGTH = 20;
const SCAN_OUT_LENGTH = 14;
const DIM_LENGTH = 27;
const GLOW_LENGTH = 32;
const CAPTION_FADE = 18;
const FINAL_FADE_LENGTH = 18; // last 0.6 s; reaches 0 on the final frame
const CAPTION = "Three simple waves → one messy sound";

const BAR_WIDTH = 8;
/** Horizontal offset between the stacked bars in the Sum row, so each stays visible. */
const STACK_DX = 10;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const OPERATORS = ["", "+", "+"];

export const SumOfSines: React.FC = () => {
  const frame = useCurrentFrame();
  const timing = useSceneTiming("SumOfSines");
  const E = timing.durationInFrames;
  const DRAW_IN = NOTE_CUES.map((c) => {
    const at = timing.cue(c).start;
    return [at, at + DRAW_LENGTH];
  });
  const sweepStart = timing.cue("Add them together").start;
  const OPERATORS_IN = [sweepStart - OPERATORS_LENGTH - 4, sweepStart - 4];
  const SWEEP = [sweepStart, timing.cue("messy wave").end];
  const SCAN_OUT = [SWEEP[1], SWEEP[1] + SCAN_OUT_LENGTH];
  const glowAt = timing.cue("that messy wave").start;
  const DIM = [glowAt, glowAt + DIM_LENGTH];
  const GLOW = [glowAt, glowAt + GLOW_LENGTH];
  const CAPTION_IN = [glowAt, glowAt + CAPTION_FADE];
  const FINAL_FADE = [E - FINAL_FADE_LENGTH, E - 1];
  checkCaptionHold("SumOfSines", CAPTION, CAPTION_IN[1], FINAL_FADE[0]);

  // Fades out everything except the sum wave and its baseline at the very end.
  const fadeAll = interpolate(frame, FINAL_FADE, [1, 0], clamp);

  const drawProgress = DRAW_IN.map(([a, b]) =>
    interpolate(frame, [a, b], [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.quad),
    }),
  );
  const labelOpacity = DRAW_IN.map(([a]) =>
    interpolate(frame, [a, a + 15], [0, 1], clamp),
  );
  const operatorsOpacity = interpolate(frame, OPERATORS_IN, [0, 1], clamp);

  const scanU = interpolate(frame, SWEEP, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.sin),
  });
  const scanOpacity =
    interpolate(frame, [SWEEP[0] - 6, SWEEP[0]], [0, 1], clamp) *
    interpolate(frame, SCAN_OUT, [1, 0], clamp);
  const scanX = ROW_PLOT_LEFT + scanU * ROW_PLOT_WIDTH;

  const sineDim = interpolate(frame, DIM, [1, 0.3], clamp);
  const glow = interpolate(frame, GLOW, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });
  const captionT = interpolate(frame, CAPTION_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  // Values at the scan line.
  const values = COMPONENTS.map((c) => componentValue(c, scanU));
  const stackStarts = values.map((_, i) =>
    values.slice(0, i).reduce((a, v) => a + v, 0),
  );
  const sumAtScan = sumValue(scanU);

  const sumY = (v: number) => SUM_ROW_PLOT.centerY - v * PX_PER_UNIT;
  const traceStarted = frame >= SWEEP[0];
  const tracePath = traceStarted
    ? wavePath(sumValue, SUM_ROW_PLOT, 0, Math.max(scanU, 0.001))
    : "";

  const scanTop = COMPONENT_ROW_PLOTS[0].centerY - PX_PER_UNIT * 1.4;
  const scanBottom = SUM_ROW_PLOT.centerY + SUM_ROW_PLOT.halfHeight + 10;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        <defs>
          <filter id="sumGlow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation={GLOW_BLUR} />
          </filter>
        </defs>

        {/* ---------- component rows ---------- */}
        {COMPONENTS.map((c, i) => {
          const rect = COMPONENT_ROW_PLOTS[i];
          const color = COLORS.components[i];
          return (
            <g key={c.freq} opacity={fadeAll}>
              <line
                x1={rect.left}
                x2={rect.left + rect.width}
                y1={rect.centerY}
                y2={rect.centerY}
                stroke={COLORS.axis}
                strokeWidth={BASELINE_STROKE}
                opacity={labelOpacity[i]}
              />
              {drawProgress[i] > 0 ? (
                <path
                  d={wavePath(
                    (u) => componentValue(c, u),
                    rect,
                    0,
                    drawProgress[i],
                  )}
                  fill="none"
                  stroke={color}
                  strokeWidth={COMPONENT_STROKE}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={sineDim}
                />
              ) : null}
            </g>
          );
        })}

        {/* divider above the Sum row */}
        <line
          x1={ROW_LABEL_X}
          x2={ROW_PLOT_LEFT + ROW_PLOT_WIDTH}
          y1={DIVIDER_Y}
          y2={DIVIDER_Y}
          stroke={COLORS.textDim}
          strokeWidth={2}
          opacity={0.6 * operatorsOpacity * fadeAll}
        />

        {/* ---------- Sum row ---------- */}
        <line
          x1={SUM_ROW_PLOT.left}
          x2={SUM_ROW_PLOT.left + SUM_ROW_PLOT.width}
          y1={SUM_ROW_PLOT.centerY}
          y2={SUM_ROW_PLOT.centerY}
          stroke={COLORS.axis}
          strokeWidth={BASELINE_STROKE}
        />
        {/* faint outline carried over from scene 1 */}
        <path
          d={wavePath(sumValue, SUM_ROW_PLOT)}
          fill="none"
          stroke={COLORS.sum}
          strokeWidth={SUM_OUTLINE_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={SUM_OUTLINE_OPACITY * fadeAll}
        />
        {traceStarted ? (
          <>
            <path
              d={tracePath}
              fill="none"
              stroke={COLORS.sum}
              strokeWidth={SUM_GLOW_STROKE}
              opacity={SUM_GLOW_OPACITY * glow}
              filter="url(#sumGlow)"
            />
            <path
              d={tracePath}
              fill="none"
              stroke={COLORS.sum}
              strokeWidth={interpolate(
                glow,
                [0, 1],
                [SUM_STROKE, SUM_STROKE_GLOWING],
              )}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {/* ---------- scan line, dots and value bars ---------- */}
        {scanOpacity > 0 ? (
          <g opacity={scanOpacity * fadeAll}>
            <line
              x1={scanX}
              x2={scanX}
              y1={scanTop}
              y2={scanBottom}
              stroke={COLORS.scan}
              strokeWidth={2}
              strokeDasharray="6 8"
              opacity={0.6}
            />
            {COMPONENTS.map((c, i) => {
              const rect = COMPONENT_ROW_PLOTS[i];
              const y = rect.centerY - values[i] * PX_PER_UNIT;
              return (
                <g key={c.freq}>
                  <line
                    x1={scanX}
                    x2={scanX}
                    y1={rect.centerY}
                    y2={y}
                    stroke={COLORS.components[i]}
                    strokeWidth={BAR_WIDTH}
                    opacity={0.85}
                  />
                  <circle
                    cx={scanX}
                    cy={y}
                    r={9}
                    fill={COLORS.components[i]}
                    stroke={COLORS.background}
                    strokeWidth={3}
                  />
                </g>
              );
            })}
            {/* bars stacked head to tail: their total is the sum */}
            {COMPONENTS.map((c, i) => {
              const x = scanX + (i - 1) * STACK_DX;
              return (
                <line
                  key={c.freq}
                  x1={x}
                  x2={x}
                  y1={sumY(stackStarts[i])}
                  y2={sumY(stackStarts[i] + values[i])}
                  stroke={COLORS.components[i]}
                  strokeWidth={BAR_WIDTH}
                />
              );
            })}
            <circle
              cx={scanX}
              cy={sumY(sumAtScan)}
              r={10}
              fill={COLORS.sum}
              stroke={COLORS.background}
              strokeWidth={3}
            />
          </g>
        ) : null}
      </svg>

      {/* ---------- labels and operators ---------- */}
      {COMPONENTS.map((c, i) => (
        <React.Fragment key={c.freq}>
          <div
            style={{
              ...rowLabelStyle,
              ...rowLabelPosition(COMPONENT_ROW_PLOTS[i].centerY),
              color: COLORS.components[i],
              opacity: labelOpacity[i] * (0.4 + 0.6 * sineDim) * fadeAll,
            }}
          >
            {c.freq} Hz
          </div>
          {OPERATORS[i] ? (
            <Operator
              symbol={OPERATORS[i]}
              centerY={COMPONENT_ROW_PLOTS[i].centerY}
              opacity={operatorsOpacity * fadeAll}
            />
          ) : null}
        </React.Fragment>
      ))}
      <Operator
        symbol="="
        centerY={SUM_ROW_PLOT.centerY}
        opacity={operatorsOpacity * fadeAll}
      />
      <div
        style={{
          ...rowLabelStyle,
          ...rowLabelPosition(SUM_ROW_PLOT.centerY),
          opacity: fadeAll,
        }}
      >
        Sum
      </div>

      {/* ---------- caption ---------- */}
      <div
        style={{
          ...captionStyle,
          position: "absolute",
          top: 925,
          width: "100%",
          opacity: captionT * fadeAll,
          transform: `translateY(${(1 - captionT) * 20}px)`,
        }}
      >
        {CAPTION}
      </div>
    </AbsoluteFill>
  );
};

const Operator: React.FC<{
  symbol: string;
  centerY: number;
  opacity: number;
}> = ({ symbol, centerY, opacity }) => (
  <div
    style={{
      ...rowLabelStyle,
      color: COLORS.text,
      fontSize: 44,
      position: "absolute",
      left: OPERATOR_X,
      top: centerY,
      transform: "translate(-50%, -50%)",
      opacity,
    }}
  >
    {symbol}
  </div>
);
