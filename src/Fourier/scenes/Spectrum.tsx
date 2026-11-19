import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BASELINE_STROKE,
  COLORS,
  COMPONENTS,
  COMPONENT_ROW_PLOTS,
  COMPONENT_STROKE,
  HEIGHT,
  PX_PER_UNIT,
  ROW_PLOT_LEFT,
  ROW_PLOT_WIDTH,
  SPECTRUM,
  SPECTRUM_SOUND_PLOT,
  SUM_STROKE,
  WIDTH,
  ampToY,
  componentValue,
  freqToX,
  rowLabelPosition,
  rowLabelStyle,
  sumValue,
  wavePath,
} from "../waves";

// Timeline (frames @ 30 fps)
export const SPECTRUM_DURATION = 360; // ~12 s
/** Each sine: squeeze to bar width, turn solid, then drop onto the axis. */
const BAR_STARTS = [10, 30, 50];
const SQUEEZE = 30;
const SOLIDIFY = [25, 40] as const; // relative to the bar's start
const DROP = [40, 72] as const; // relative to the bar's start
const FREQ_AXIS_IN = [50, 75] as const;
const FREQ_LABELS_IN = 132;
const FREQ_LABEL_STAGGER = 6;
const STRENGTH_AXIS_IN = [168, 196] as const;
const SOUND_IN = [212, 250] as const;

const STRENGTH_TICKS = [0.5, 1];

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const smallLabel: React.CSSProperties = { ...rowLabelStyle, fontSize: 30 };

export type SpectrumProps = {
  /**
   * Per-component gain (220, 440, 660 Hz), scaling both its bar and its share
   * of the Sound wave. Omitted = the untouched spectrum. Used by Filter.
   */
  gains?: readonly number[];
};

export const Spectrum: React.FC<SpectrumProps> = ({ gains }) => {
  const frame = useCurrentFrame();
  const gain = (i: number) => (gains ? gains[i] : 1);
  const sound = gains
    ? (u: number) =>
        COMPONENTS.reduce(
          (acc, c, i) => acc + gain(i) * componentValue(c, u),
          0,
        )
    : sumValue;

  const freqAxis = interpolate(frame, FREQ_AXIS_IN, [0, 1], clamp);
  const strengthAxis = interpolate(frame, STRENGTH_AXIS_IN, [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const soundT = interpolate(frame, SOUND_IN, [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });

  const axisTopY = ampToY(SPECTRUM.maxAmp);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        {/* strength gridlines, behind the bars */}
        {STRENGTH_TICKS.map((a) => (
          <line
            key={a}
            x1={SPECTRUM.axisLeft}
            x2={SPECTRUM.axisRight}
            y1={ampToY(a)}
            y2={ampToY(a)}
            stroke={COLORS.axis}
            strokeWidth={1.5}
            strokeDasharray="4 8"
            opacity={interpolate(strengthAxis, [0.6, 1], [0, 1], clamp)}
          />
        ))}

        {/* ---------- sines squeezing into bars ---------- */}
        {COMPONENTS.map((c, i) => {
          const s = BAR_STARTS[i];
          const row = COMPONENT_ROW_PLOTS[i];
          const color = COLORS.components[i];
          const barX = freqToX(c.freq);

          const squeeze = interpolate(frame, [s, s + SQUEEZE], [0, 1], {
            ...clamp,
            easing: Easing.inOut(Easing.cubic),
          });
          const solid = interpolate(
            frame,
            [s + SOLIDIFY[0], s + SOLIDIFY[1]],
            [0, 1],
            clamp,
          );
          const drop = interpolate(frame, [s + DROP[0], s + DROP[1]], [0, 1], {
            ...clamp,
            easing: Easing.inOut(Easing.cubic),
          });

          // Squeezed sine: same height, width shrinking onto the bar's column.
          const width = interpolate(
            squeeze,
            [0, 1],
            [ROW_PLOT_WIDTH, SPECTRUM.barWidth],
          );
          const centerX = interpolate(
            squeeze,
            [0, 1],
            [ROW_PLOT_LEFT + ROW_PLOT_WIDTH / 2, barX],
          );
          const waveRect = { ...row, left: centerX - width / 2, width };

          // Solid block: starts covering the squeezed sine's band (±amp on the
          // shared row scale) and drops to the axis with height = amplitude.
          const top = interpolate(
            drop,
            [0, 1],
            [row.centerY - c.amp * PX_PER_UNIT, ampToY(c.amp * gain(i))],
          );
          const bottom = interpolate(
            drop,
            [0, 1],
            [row.centerY + c.amp * PX_PER_UNIT, SPECTRUM.baseY],
          );

          return (
            <g key={c.freq}>
              {/* row baseline leaves with the sine */}
              <line
                x1={row.left}
                x2={row.left + row.width}
                y1={row.centerY}
                y2={row.centerY}
                stroke={COLORS.axis}
                strokeWidth={BASELINE_STROKE}
                opacity={1 - squeeze}
              />
              {solid < 1 ? (
                <path
                  d={wavePath((u) => componentValue(c, u), waveRect)}
                  fill="none"
                  stroke={color}
                  strokeWidth={COMPONENT_STROKE}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={1 - solid}
                />
              ) : null}
              {solid > 0 ? (
                <rect
                  x={barX - SPECTRUM.barWidth / 2}
                  y={top}
                  width={SPECTRUM.barWidth}
                  height={bottom - top}
                  rx={SPECTRUM.barRadius}
                  fill={color}
                  opacity={solid}
                />
              ) : null}
            </g>
          );
        })}

        {/* ---------- frequency axis ---------- */}
        <line
          x1={SPECTRUM.axisLeft}
          x2={SPECTRUM.axisRight}
          y1={SPECTRUM.baseY}
          y2={SPECTRUM.baseY}
          stroke={COLORS.textDim}
          strokeWidth={3}
          opacity={freqAxis}
        />
        <Arrow
          x={SPECTRUM.axisRight}
          y={SPECTRUM.baseY}
          dir="right"
          opacity={freqAxis}
        />

        {/* ---------- strength axis ---------- */}
        {strengthAxis > 0 ? (
          <g opacity={Math.min(1, strengthAxis * 2)}>
            <line
              x1={SPECTRUM.axisLeft}
              x2={SPECTRUM.axisLeft}
              y1={SPECTRUM.baseY}
              y2={interpolate(strengthAxis, [0, 1], [SPECTRUM.baseY, axisTopY])}
              stroke={COLORS.textDim}
              strokeWidth={3}
            />
            <Arrow
              x={SPECTRUM.axisLeft}
              y={interpolate(strengthAxis, [0, 1], [SPECTRUM.baseY, axisTopY])}
              dir="up"
              opacity={1}
            />
            {STRENGTH_TICKS.map((a) => (
              <g
                key={a}
                opacity={interpolate(strengthAxis, [0.6, 1], [0, 1], clamp)}
              >
                <line
                  x1={SPECTRUM.axisLeft - 10}
                  x2={SPECTRUM.axisLeft}
                  y1={ampToY(a)}
                  y2={ampToY(a)}
                  stroke={COLORS.textDim}
                  strokeWidth={3}
                />
              </g>
            ))}
          </g>
        ) : null}

        {/* ---------- the sound, at the top ---------- */}
        {soundT > 0 ? (
          <g>
            <line
              x1={SPECTRUM_SOUND_PLOT.left}
              x2={SPECTRUM_SOUND_PLOT.left + SPECTRUM_SOUND_PLOT.width}
              y1={SPECTRUM_SOUND_PLOT.centerY}
              y2={SPECTRUM_SOUND_PLOT.centerY}
              stroke={COLORS.axis}
              strokeWidth={BASELINE_STROKE}
              opacity={soundT}
            />
            <path
              d={wavePath(sound, SPECTRUM_SOUND_PLOT, 0, soundT)}
              fill="none"
              stroke={COLORS.sum}
              strokeWidth={SUM_STROKE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ) : null}
      </svg>

      {/* ---------- row labels leave as their sines squeeze ---------- */}
      {COMPONENTS.map((c, i) => (
        <div
          key={c.freq}
          style={{
            ...rowLabelStyle,
            ...rowLabelPosition(COMPONENT_ROW_PLOTS[i].centerY),
            color: COLORS.components[i],
            opacity: interpolate(
              frame,
              [BAR_STARTS[i], BAR_STARTS[i] + 15],
              [1, 0],
              clamp,
            ),
          }}
        >
          {c.freq} Hz
        </div>
      ))}

      {/* ---------- frequency labels under the bars ---------- */}
      {COMPONENTS.map((c, i) => {
        const start = FREQ_LABELS_IN + i * FREQ_LABEL_STAGGER;
        const t = interpolate(frame, [start, start + 15], [0, 1], {
          ...clamp,
          easing: Easing.out(Easing.cubic),
        });
        return (
          <div
            key={c.freq}
            style={{
              ...smallLabel,
              position: "absolute",
              left: freqToX(c.freq) - 100,
              width: 200,
              top: SPECTRUM.baseY + 16 + (1 - t) * 10,
              textAlign: "center",
              color: COLORS.components[i],
              opacity: t,
            }}
          >
            {c.freq} Hz
          </div>
        );
      })}
      <div
        style={{
          ...smallLabel,
          position: "absolute",
          left: SPECTRUM.axisRight - 160,
          width: 160,
          top: SPECTRUM.baseY + 60,
          textAlign: "right",
          opacity: interpolate(
            frame,
            [FREQ_LABELS_IN + 12, FREQ_LABELS_IN + 30],
            [0, 1],
            clamp,
          ),
        }}
      >
        frequency
      </div>

      {/* ---------- strength axis labels ---------- */}
      <AbsoluteFill
        style={{ opacity: interpolate(strengthAxis, [0.6, 1], [0, 1], clamp) }}
      >
        {STRENGTH_TICKS.map((a) => (
          <div
            key={a}
            style={{
              ...smallLabel,
              fontSize: 24,
              position: "absolute",
              left: SPECTRUM.axisLeft - 80,
              width: 60,
              top: ampToY(a),
              transform: "translateY(-50%)",
              textAlign: "right",
            }}
          >
            {a}
          </div>
        ))}
        <div
          style={{
            ...smallLabel,
            position: "absolute",
            left: SPECTRUM.axisLeft - 100,
            width: 200,
            top: axisTopY - 56,
            textAlign: "center",
          }}
        >
          strength
        </div>
      </AbsoluteFill>

      {/* ---------- sound label ---------- */}
      <div
        style={{
          ...rowLabelStyle,
          ...rowLabelPosition(SPECTRUM_SOUND_PLOT.centerY),
          color: COLORS.sum,
          opacity: interpolate(soundT, [0, 0.4], [0, 1], clamp),
        }}
      >
        Sound
      </div>
    </AbsoluteFill>
  );
};

const Arrow: React.FC<{
  x: number;
  y: number;
  dir: "up" | "right";
  opacity: number;
}> = ({ x, y, dir, opacity }) => {
  const s = 12;
  const points =
    dir === "right"
      ? `${x + s},${y} ${x - 4},${y - s * 0.7} ${x - 4},${y + s * 0.7}`
      : `${x},${y - s} ${x - s * 0.7},${y + 4} ${x + s * 0.7},${y + 4}`;
  return <polygon points={points} fill={COLORS.textDim} opacity={opacity} />;
};
