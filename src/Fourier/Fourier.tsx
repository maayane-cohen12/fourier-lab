import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Series } from "remotion";
import { COLORS } from "./waves";
import {
  NarrationProvider,
  SceneNarration,
} from "./narration/NarrationContext";
import {
  AudioDurations,
  SCENE_IDS,
  SceneId,
  loadAudioDurations,
  sceneDurationInFrames,
} from "./narration/timing";
import { Intro } from "./scenes/Intro";
import { MessyWave } from "./scenes/MessyWave";
import { WhatIsASine } from "./scenes/WhatIsASine";
import { SumOfSines } from "./scenes/SumOfSines";
import { SplitBack } from "./scenes/SplitBack";
import { HowItFinds } from "./scenes/HowItFinds";
import { Spectrum } from "./scenes/Spectrum";
import { Filter } from "./scenes/Filter";
import { EverydayUses } from "./scenes/EverydayUses";
import { Recap } from "./scenes/Recap";

/** Scene components; the order (and audio file) comes from SCENE_IDS. */
export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  Intro,
  MessyWave,
  WhatIsASine,
  SumOfSines,
  SplitBack,
  HowItFinds,
  Spectrum,
  Filter,
  EverydayUses,
  Recap,
};

// ---------------------------------------------------------------------------
// The full video
// ---------------------------------------------------------------------------

export type FourierProps = { durations: AudioDurations | null };

export const calculateFourierMetadata: CalculateMetadataFunction<
  FourierProps
> = async () => {
  const durations = await loadAudioDurations();
  return {
    durationInFrames: SCENE_IDS.reduce(
      (a, id) => a + sceneDurationInFrames(durations[id]),
      0,
    ),
    props: { durations },
  };
};

export const Fourier: React.FC<FourierProps> = ({ durations }) => {
  if (!durations) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <NarrationProvider durations={durations}>
        <Series>
          {SCENE_IDS.map((id) => {
            const Scene = SCENE_COMPONENTS[id];
            return (
              <Series.Sequence
                key={id}
                durationInFrames={sceneDurationInFrames(durations[id])}
                name={id}
              >
                <Scene />
                <SceneNarration id={id} />
              </Series.Sequence>
            );
          })}
        </Series>
      </NarrationProvider>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// One scene on its own (the Fourier-scenes folder)
// ---------------------------------------------------------------------------

export type FourierSceneProps = {
  id: SceneId;
  durations: AudioDurations | null;
};

export const calculateSceneMetadata: CalculateMetadataFunction<
  FourierSceneProps
> = async ({ props }) => {
  const durations = await loadAudioDurations();
  return {
    durationInFrames: sceneDurationInFrames(durations[props.id]),
    props: { ...props, durations },
  };
};

export const FourierScene: React.FC<FourierSceneProps> = ({
  id,
  durations,
}) => {
  if (!durations) return null;
  const Scene = SCENE_COMPONENTS[id];
  return (
    <NarrationProvider durations={durations}>
      <Scene />
      <SceneNarration id={id} />
    </NarrationProvider>
  );
};
