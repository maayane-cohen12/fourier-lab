import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { COLORS } from "./waves";
import { MESSY_WAVE_DURATION, MessyWave } from "./scenes/MessyWave";
import { SUM_OF_SINES_DURATION, SumOfSines } from "./scenes/SumOfSines";
import { SPLIT_BACK_DURATION, SplitBack } from "./scenes/SplitBack";
import { HOW_IT_FINDS_DURATION, HowItFinds } from "./scenes/HowItFinds";
import { SPECTRUM_DURATION, Spectrum } from "./scenes/Spectrum";

/** Scenes in order. Add new scenes here and they flow into the full video. */
export const SCENES = [
  { id: "MessyWave", component: MessyWave, duration: MESSY_WAVE_DURATION },
  {
    id: "SumOfSines",
    component: SumOfSines,
    duration: SUM_OF_SINES_DURATION,
  },
  { id: "SplitBack", component: SplitBack, duration: SPLIT_BACK_DURATION },
  {
    id: "HowItFinds",
    component: HowItFinds,
    duration: HOW_IT_FINDS_DURATION,
  },
  { id: "Spectrum", component: Spectrum, duration: SPECTRUM_DURATION },
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
