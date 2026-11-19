import { Audio } from "@remotion/media";
import React, { createContext, useContext, useMemo } from "react";
import { Sequence } from "remotion";
import {
  AudioDurations,
  SceneId,
  SceneTiming,
  audioFile,
  sceneTiming,
} from "./timing";

const DurationsContext = createContext<AudioDurations | null>(null);

/** Makes every scene's narration timing available to the scenes below it. */
export const NarrationProvider: React.FC<{
  durations: AudioDurations;
  children: React.ReactNode;
}> = ({ durations, children }) => (
  <DurationsContext.Provider value={durations}>
    {children}
  </DurationsContext.Provider>
);

/** Timing of any scene (a scene may need another's, e.g. to freeze on it). */
export const useSceneTiming = (id: SceneId): SceneTiming => {
  const durations = useContext(DurationsContext);
  if (!durations) {
    throw new Error("useSceneTiming needs a <NarrationProvider> above it");
  }
  return useMemo(() => sceneTiming(id, durations[id]), [durations, id]);
};

/** Plays a scene's narration, starting AUDIO_START_SEC into the scene. */
export const SceneNarration: React.FC<{ id: SceneId }> = ({ id }) => {
  const timing = useSceneTiming(id);
  return (
    <Sequence from={timing.audioStart} layout="none" name={`Narration ${id}`}>
      <Audio src={audioFile(id)} />
    </Sequence>
  );
};
