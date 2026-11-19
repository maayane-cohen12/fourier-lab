import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { COLORS } from "./waves";
import { MESSY_WAVE_DURATION, MessyWave } from "./scenes/MessyWave";
import { SUM_OF_SINES_DURATION, SumOfSines } from "./scenes/SumOfSines";

/** Scenes in order. Add new scenes here and they flow into the full video. */
export const SCENES = [
  { id: "MessyWave", component: MessyWave, duration: MESSY_WAVE_DURATION },
  {
    id: "SumOfSines",
    component: SumOfSines,
    duration: SUM_OF_SINES_DURATION,
  },
] as const;

export const FOURIER_DURATION = SCENES.reduce((a, s) => a + s.duration, 0);

export const Fourier: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Series>
        {SCENES.map((s) => (
          <Series.Sequence key={s.id} durationInFrames={s.duration} name={s.id}>
            <s.component />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
