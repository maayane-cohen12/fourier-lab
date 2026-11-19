import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BASELINE_STROKE,
  COLORS,
  COMPARE_PLOT,
  COMPONENTS,
  COMPONENT_ROW_PLOTS,
  COMPONENT_STROKE,
  HEIGHT,
  METER,
  PRODUCT_PLOT,
  PlotRect,
  SUM_STROKE,
  WIDTH,
  areaPath,
  componentValue,
  productScore,
  rowLabelPosition,
  rowLabelStyle,
  sumValue,
  testSine,
  wavePath,
} from "../waves";
import { useSceneTiming } from "../narration/NarrationContext";
import { checkCaptionHold } from "../narration/timing";

// Timeline (frames @ 30 fps), synced to scene6.wav: the analysis comes in on
// "It tries one frequency"; the matching 440 Hz test slides in on "When they
// match" and its meter is full (and stays full) until "the score is high" has
// been said; the 300 Hz test starts on "When they don't" and its sweep ends as
// "close to zero" is said. The rows come back at the end, matching SplitBack's
// last frame again.
const ROWS_DIM = [10, 35] as const;
const ROWS_DIM_LEVEL = 0.2;
const ANALYSIS_FADE = 30;
const SLIDE_LENGTH = 20;
const OUT_LENGTH = 14;
const FULL_BEFORE_SAID = 10; // meter is full this long before the words end

type Trial = {
  freq: number;
  phase: number;
  slide: readonly number[]; // test sine slides into place
  reveal: readonly number[]; // product drawn left to right
  out: readonly number[]; // test + product fade, meter resets
};

/** How far the test sine is shifted before it slides into place (plot widths). */
const SLIDE_DISTANCE = 0.6;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const labelStyle: React.CSSProperties = { ...rowLabelStyle, fontSize: 30 };

export const HowItFinds: React.FC = () => {
  const frame = useCurrentFrame();
  const timing = useSceneTiming("HowItFinds");
  const E = timing.durationInFrames;
  const analysisAt = timing.cue("It tries one frequency").start;
  const ANALYSIS_IN = [analysisAt, analysisAt + ANALYSIS_FADE];
  const ANALYSIS_OUT = [E - 60, E - 35];
  const ROWS_UNDIM = [E - 40, E - 5];

  const matchAt = timing.cue("When they match").start;
  const highSaid = timing.cue("the score is high").end;
  const noMatchAt = timing.cue("When they don't").start;
  const zeroSaid = timing.cue("close to zero").end;
  const TRIALS: Trial[] = [
    // Matches the 440 Hz component exactly (same frequency and phase).
    {
      freq: 440,
      phase: COMPONENTS[1].phase,
      slide: [matchAt, matchAt + SLIDE_LENGTH],
      reveal: [matchAt + SLIDE_LENGTH, highSaid - FULL_BEFORE_SAID],
      // The full bar stays up until "the score is high" has been said.
      out: [highSaid, Math.min(highSaid + OUT_LENGTH, noMatchAt - 1)],
    },
    // Does not match anything. 300 Hz is a non-whole number of cycles across
    // the plot, so the final score depends on phase; 2.0 lands near zero.
    {
      freq: 300,
      phase: 2.0,
      slide: [noMatchAt, noMatchAt + SLIDE_LENGTH],
      reveal: [noMatchAt + SLIDE_LENGTH, zeroSaid],
      out: ANALYSIS_OUT,
    },
  ];

  const rowOpacity =
    frame < ROWS_UNDIM[0]
      ? interpolate(frame, ROWS_DIM, [1, ROWS_DIM_LEVEL], clamp)
      : interpolate(frame, ROWS_UNDIM, [ROWS_DIM_LEVEL, 1], clamp);

  const analysisOpacity =
    interpolate(frame, ANALYSIS_IN, [0, 1], clamp) *
    interpolate(frame, ANALYSIS_OUT, [1, 0], clamp);

  for (const t of TRIALS) {
    checkCaptionHold(
      "HowItFinds",
      `× test ${t.freq} Hz`,
      t.slide[0] + 12,
      t.out[0],
    );
  }

  // The trial on screen: the last one whose slide has begun.
  const trial = TRIALS.filter((t) => frame >= t.slide[0]).pop() ?? TRIALS[0];
  const test = testSine(trial.freq, trial.phase);

  const slideT = interpolate(frame, trial.slide, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const slideShift = (1 - slideT) * SLIDE_DISTANCE;
  const trialOpacity =
    interpolate(frame, [trial.slide[0], trial.slide[0] + 12], [0, 1], clamp) *
    interpolate(frame, trial.out, [1, 0], clamp);
  const reveal = interpolate(frame, trial.reveal, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.sin),
  });
  const revealing = frame >= trial.reveal[0];

  const score = revealing ? productScore(test, reveal) : 0;
  const meterValue = score * interpolate(frame, trial.out, [1, 0], clamp);

  const product = (u: number) => sumValue(u) * test(u);
  const scanX = COMPARE_PLOT.left + reveal * COMPARE_PLOT.width;
  const scanVisible =
    revealing && frame < trial.reveal[1] + 8 ? trialOpacity : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        <defs>
          <clipPath id="aboveZero">
            <rect x={0} y={0} width={WIDTH} height={PRODUCT_PLOT.centerY} />
          </clipPath>
          <clipPath id="belowZero">
            <rect
              x={0}
              y={PRODUCT_PLOT.centerY}
              width={WIDTH}
              height={HEIGHT - PRODUCT_PLOT.centerY}
            />
          </clipPath>
        </defs>

        {/* ---------- the three component rows (as SplitBack ends) ---------- */}
        <g opacity={rowOpacity}>
          {COMPONENT_ROW_PLOTS.map((rect, i) => (
            <line
              key={COMPONENTS[i].freq}
              x1={rect.left}
              x2={rect.left + rect.width}
              y1={rect.centerY}
              y2={rect.centerY}
              stroke={COLORS.axis}
              strokeWidth={BASELINE_STROKE}
            />
          ))}
          {COMPONENTS.map((c, i) => (
            <path
              key={c.freq}
              d={wavePath((u) => componentValue(c, u), COMPONENT_ROW_PLOTS[i])}
              fill="none"
              stroke={COLORS.components[i]}
              strokeWidth={COMPONENT_STROKE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </g>

        {analysisOpacity > 0 ? (
          <g opacity={analysisOpacity}>
            {/* ---------- sound × test ---------- */}
            <Baseline rect={COMPARE_PLOT} />
            <path
              d={wavePath(sumValue, COMPARE_PLOT)}
              fill="none"
              stroke={COLORS.sum}
              strokeWidth={SUM_STROKE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={wavePath(test, COMPARE_PLOT, slideShift)}
              fill="none"
              stroke={COLORS.test}
              strokeWidth={3}
              strokeDasharray="10 7"
              opacity={trialOpacity}
            />

            {/* ---------- product, shaded to zero ---------- */}
            <Baseline rect={PRODUCT_PLOT} />
            {revealing ? (
              <g opacity={trialOpacity}>
                <path
                  d={areaPath(product, PRODUCT_PLOT, reveal)}
                  fill={COLORS.areaPositive}
                  opacity={0.4}
                  clipPath="url(#aboveZero)"
                />
                <path
                  d={areaPath(product, PRODUCT_PLOT, reveal)}
                  fill={COLORS.areaNegative}
                  opacity={0.4}
                  clipPath="url(#belowZero)"
                />
                <path
                  d={wavePath(product, PRODUCT_PLOT, 0, reveal)}
                  fill="none"
                  stroke={COLORS.text}
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
              </g>
            ) : null}

            {/* scan line while the product is being built */}
            <line
              x1={scanX}
              x2={scanX}
              y1={COMPARE_PLOT.centerY - 110}
              y2={PRODUCT_PLOT.centerY + 110}
              stroke={COLORS.scan}
              strokeWidth={2}
              strokeDasharray="6 8"
              opacity={0.6 * scanVisible}
            />

            {/* ---------- score meter ---------- */}
            <rect
              x={METER.x}
              y={METER.top}
              width={METER.width}
              height={METER.bottom - METER.top}
              rx={8}
              fill={COLORS.axis}
              opacity={0.45}
            />
            <MeterFill value={meterValue} />
            <line
              x1={METER.x - 10}
              x2={METER.x + METER.width + 10}
              y1={METER.zeroY}
              y2={METER.zeroY}
              stroke={COLORS.textDim}
              strokeWidth={2}
            />
          </g>
        ) : null}
      </svg>

      {/* ---------- row labels ---------- */}
      {COMPONENTS.map((c, i) => (
        <div
          key={c.freq}
          style={{
            ...rowLabelStyle,
            ...rowLabelPosition(COMPONENT_ROW_PLOTS[i].centerY),
            color: COLORS.components[i],
            opacity: rowOpacity,
          }}
        >
          {c.freq} Hz
        </div>
      ))}

      {/* ---------- analysis labels ---------- */}
      {analysisOpacity > 0 ? (
        <AbsoluteFill style={{ opacity: analysisOpacity }}>
          <div
            style={{
              ...labelStyle,
              ...rowLabelPosition(COMPARE_PLOT.centerY - 22),
              color: COLORS.sum,
            }}
          >
            sound
          </div>
          <div
            style={{
              ...labelStyle,
              ...rowLabelPosition(COMPARE_PLOT.centerY + 22),
              color: COLORS.test,
              opacity: trialOpacity,
            }}
          >
            × test {trial.freq} Hz
          </div>
          <div
            style={{
              ...labelStyle,
              ...rowLabelPosition(PRODUCT_PLOT.centerY),
              color: COLORS.text,
            }}
          >
            = product
          </div>
          <div
            style={{
              ...labelStyle,
              position: "absolute",
              left: METER.x + METER.width / 2,
              top: METER.top - 34,
              transform: "translate(-50%, -50%)",
              color: COLORS.text,
            }}
          >
            score
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const Baseline: React.FC<{ rect: PlotRect }> = ({ rect }) => (
  <line
    x1={rect.left}
    x2={rect.left + rect.width}
    y1={rect.centerY}
    y2={rect.centerY}
    stroke={COLORS.axis}
    strokeWidth={BASELINE_STROKE}
  />
);

const MeterFill: React.FC<{ value: number }> = ({ value }) => {
  // Clamped to the track: the running score of the non-matching test dips to
  // about -0.35 mid-sweep, deeper than the track goes below zero.
  const h = Math.max(
    -(METER.bottom - METER.zeroY - METER.inset),
    Math.min(
      METER.zeroY - METER.top - METER.inset,
      (value / METER.max) * (METER.zeroY - METER.top),
    ),
  );
  if (Math.abs(h) < 0.5) return null;
  return (
    <rect
      x={METER.x + METER.inset}
      y={h > 0 ? METER.zeroY - h : METER.zeroY}
      width={METER.width - 2 * METER.inset}
      height={Math.abs(h)}
      rx={5}
      fill={h > 0 ? COLORS.areaPositive : COLORS.areaNegative}
    />
  );
};
