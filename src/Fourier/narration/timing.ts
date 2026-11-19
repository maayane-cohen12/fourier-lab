// Narration timing: scene lengths from the audio files, cue frames from words.json.
//
// Each scene lasts its narration + SCENE_PAD_SEC, and its audio starts
// AUDIO_START_SEC in. Word times come from align.py (re-run it after
// regenerating the audio with narrate.py).

import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import { staticFile } from "remotion";
import { FPS } from "../waves";
import words from "./words.json";

/** Scenes in video order; scene N plays public/audio/sceneN.wav. */
export const SCENE_IDS = [
  "Intro",
  "MessyWave",
  "WhatIsASine",
  "SumOfSines",
  "SplitBack",
  "HowItFinds",
  "Spectrum",
  "Filter",
  "EverydayUses",
  "Recap",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export const AUDIO_START_SEC = 0.3;
export const SCENE_PAD_SEC = 2.5;

/** Narration length of each scene's audio file, in seconds. */
export type AudioDurations = Record<SceneId, number>;

export const audioFile = (id: SceneId): string =>
  staticFile(`audio/scene${SCENE_IDS.indexOf(id) + 1}.wav`);

const audioDuration = async (src: string): Promise<number> => {
  const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(src) });
  return input.computeDuration();
};

/** Reads every scene's audio duration from the files themselves. */
export const loadAudioDurations = async (): Promise<AudioDurations> => {
  const secs = await Promise.all(
    SCENE_IDS.map((id) => audioDuration(audioFile(id))),
  );
  return Object.fromEntries(
    SCENE_IDS.map((id, i) => [id, secs[i]]),
  ) as AudioDurations;
};

export const secToFrames = (sec: number): number => Math.round(sec * FPS);

export const sceneDurationInFrames = (audioSec: number): number =>
  Math.ceil((audioSec + SCENE_PAD_SEC) * FPS);

type Word = { word: string; start: number; end: number };
const WORDS = words as unknown as Record<string, { words: Word[] }>;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9'-]/g, ""))
    .filter(Boolean);

export type Cue = {
  /** Frame (from the scene start) where the phrase's first word starts. */
  start: number;
  /** Frame where the phrase's last word ends. */
  end: number;
};

export type SceneTiming = {
  id: SceneId;
  durationInFrames: number;
  /** Frame the narration audio starts. */
  audioStart: number;
  /** Frame the narration audio ends. */
  audioEnd: number;
  /** When a phrase of this scene's narration is spoken. Throws if absent. */
  cue: (phrase: string) => Cue;
};

export const sceneTiming = (id: SceneId, audioSec: number): SceneTiming => {
  const list = WORDS[`scene${SCENE_IDS.indexOf(id) + 1}`]?.words ?? [];
  const spoken = list.map((w) => normalize(w.word)[0] ?? "");
  const toFrame = (sec: number) => secToFrames(AUDIO_START_SEC + sec);

  return {
    id,
    durationInFrames: sceneDurationInFrames(audioSec),
    audioStart: secToFrames(AUDIO_START_SEC),
    audioEnd: toFrame(audioSec),
    cue: (phrase) => {
      const target = normalize(phrase);
      for (let i = 0; i + target.length <= spoken.length; i++) {
        if (target.every((t, k) => spoken[i + k] === t)) {
          return {
            start: toFrame(list[i].start),
            end: toFrame(list[i + target.length - 1].end),
          };
        }
      }
      throw new Error(`"${phrase}" is not in the ${id} narration`);
    },
  };
};

/** Every caption stays fully visible at least this long. */
export const MIN_CAPTION_FRAMES = secToFrames(1.5);

/**
 * Throws if a caption is fully visible for less than MIN_CAPTION_FRAMES, so a
 * change to the narration cannot silently cut a caption short.
 */
export const checkCaptionHold = (
  scene: SceneId,
  caption: string,
  fullyVisibleAt: number,
  startsLeavingAt: number,
): void => {
  const held = startsLeavingAt - fullyVisibleAt;
  if (held < MIN_CAPTION_FRAMES) {
    throw new Error(
      `${scene}: caption "${caption}" is fully visible for ${held} frames, needs ${MIN_CAPTION_FRAMES}`,
    );
  }
};
