import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BASELINE_STROKE,
  COLORS,
  HEIGHT,
  WIDTH,
  rowLabelStyle,
} from "../waves";
import { useSceneTiming } from "../narration/NarrationContext";
import { checkCaptionHold } from "../narration/timing";

// Timeline (frames @ 30 fps), synced to scene9.wav. Each icon pops in on its
// word ("music", "headphones", "Shazam"), a few frames before it is said.
// Starts and ends on the empty background (between Filter and Recap).
const POP_LEAD = 3; // icon starts popping this long before its word
const POP_LENGTH = 14;
const BAR_DELAY = 6; // bars start growing this long after their icon
const BAR_GROW = 18;
const BAR_STAGGER = 4;
/** Fade to the empty background, anchored to the scene end (E). */
const allOutRange = (E: number) => [E - 32, E - 10];

const ICON_SIZE = 180; // icons are drawn in a 200 x 200 box, scaled to this
const ROW_Y = 470; // vertical center of the icons
const BAR_WIDTH = 30;
const BAR_GAP = 14;
const BAR_BASE_Y = ROW_Y + ICON_SIZE / 2;

type Use = {
  /** The narration word the icon pops in on. */
  word: string;
  Icon: React.FC<{ color: string }>;
  label: string;
  /** Heights of the blue / orange / pink bars, in pixels. */
  bars: [number, number, number];
};

const USES: Use[] = [
  {
    word: "music",
    Icon: MusicNote,
    label: "compress songs",
    bars: [120, 80, 45],
  },
  {
    word: "headphones",
    Icon: Headphones,
    label: "remove hum",
    bars: [55, 130, 70],
  },
  {
    word: "Shazam",
    Icon: Phone,
    label: "recognize songs",
    bars: [90, 60, 115],
  },
];
const COLUMN_X = [WIDTH / 6, WIDTH / 2, (WIDTH * 5) / 6]; // column centers

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const EverydayUses: React.FC = () => {
  const frame = useCurrentFrame();
  const timing = useSceneTiming("EverydayUses");
  const ALL_OUT = allOutRange(timing.durationInFrames);
  const uses = USES.map((use) => ({
    ...use,
    at: timing.cue(use.word).start - POP_LEAD,
  }));
  for (const use of uses) {
    checkCaptionHold(
      "EverydayUses",
      use.label,
      use.at + POP_LENGTH + 6,
      ALL_OUT[0],
    );
  }
  const allOut = interpolate(frame, ALL_OUT, [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        {uses.map((use, i) => {
          const pop = interpolate(
            frame,
            [use.at, use.at + POP_LENGTH],
            [0, 1],
            {
              ...clamp,
              easing: Easing.out(Easing.back(1.6)),
            },
          );
          const shown = interpolate(
            frame,
            [use.at, use.at + POP_LENGTH / 2],
            [0, 1],
            clamp,
          );
          const opacity = shown * allOut;
          if (opacity <= 0) return null;

          // Icon on the left of the column, spectrum on the right.
          const iconCx = COLUMN_X[i] - 95;
          const barsLeft = COLUMN_X[i] + 30;
          const barsRight = barsLeft + 3 * BAR_WIDTH + 2 * BAR_GAP;
          const scale = (0.7 + 0.3 * pop) * (ICON_SIZE / 200);

          return (
            <g key={use.label} opacity={opacity}>
              <g
                transform={`translate(${iconCx} ${ROW_Y}) scale(${scale}) translate(-100 -100)`}
              >
                <use.Icon color={COLORS.text} />
              </g>

              <line
                x1={barsLeft - 10}
                x2={barsRight + 10}
                y1={BAR_BASE_Y}
                y2={BAR_BASE_Y}
                stroke={COLORS.axis}
                strokeWidth={BASELINE_STROKE}
              />
              {use.bars.map((h, b) => {
                const start = use.at + BAR_DELAY + b * BAR_STAGGER;
                const grow = interpolate(
                  frame,
                  [start, start + BAR_GROW],
                  [0, 1],
                  { ...clamp, easing: Easing.out(Easing.cubic) },
                );
                const height = h * grow;
                return (
                  <rect
                    key={b}
                    x={barsLeft + b * (BAR_WIDTH + BAR_GAP)}
                    y={BAR_BASE_Y - height}
                    width={BAR_WIDTH}
                    height={height}
                    rx={4}
                    fill={COLORS.components[b]}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {uses.map((use, i) => {
        const shown = interpolate(
          frame,
          [use.at + POP_LENGTH / 2, use.at + POP_LENGTH + 6],
          [0, 1],
          clamp,
        );
        const opacity = shown * allOut;
        return opacity > 0 ? (
          <div
            key={use.label}
            style={{
              ...rowLabelStyle,
              position: "absolute",
              left: COLUMN_X[i] - 300,
              width: 600,
              top: BAR_BASE_Y + 40,
              textAlign: "center",
              opacity,
            }}
          >
            {use.label}
          </div>
        ) : null;
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Icons, drawn in a 200 x 200 box
// ---------------------------------------------------------------------------

function MusicNote({ color }: { color: string }) {
  return (
    <g fill={color} stroke={color}>
      {/* two note heads */}
      <ellipse
        cx={58}
        cy={152}
        rx={26}
        ry={19}
        transform="rotate(-20 58 152)"
      />
      <ellipse
        cx={148}
        cy={132}
        rx={26}
        ry={19}
        transform="rotate(-20 148 132)"
      />
      {/* stems */}
      <rect x={78} y={56} width={10} height={98} stroke="none" />
      <rect x={168} y={38} width={10} height={96} stroke="none" />
      {/* beam */}
      <path d="M78 44 L178 24 L178 50 L78 70 Z" stroke="none" />
    </g>
  );
}

function Headphones({ color }: { color: string }) {
  return (
    <g>
      {/* headband */}
      <path
        d="M36 120 V100 A64 64 0 0 1 164 100 V120"
        fill="none"
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
      />
      {/* ear cups */}
      <rect x={22} y={108} width={42} height={70} rx={14} fill={color} />
      <rect x={136} y={108} width={42} height={70} rx={14} fill={color} />
    </g>
  );
}

function Phone({ color }: { color: string }) {
  return (
    <g>
      {/* body */}
      <rect
        x={55}
        y={10}
        width={90}
        height={180}
        rx={18}
        fill="none"
        stroke={color}
        strokeWidth={10}
      />
      {/* speaker slot and home indicator */}
      <rect x={85} y={26} width={30} height={6} rx={3} fill={color} />
      <rect x={82} y={168} width={36} height={6} rx={3} fill={color} />
      {/* a little sound wave on the screen */}
      <path
        d="M70 100 Q80 75 90 100 T110 100 T130 100"
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
      />
    </g>
  );
}
