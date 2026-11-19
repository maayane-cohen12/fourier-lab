# The Fourier Transform — Explainer Script

**Target length:** ~46 seconds
**Goal:** The viewer understands that any sound is a sum of simple sine waves, and that the Fourier transform finds which frequencies are in it and how strong each one is.

## Narration

| # | Time (approx.) | Narration |
|---|----------------|-----------|
| 1 | 0:00 – 0:08 | This wiggly line is what sound looks like to a computer. It looks like chaos, but there is a hidden pattern inside. |
| 2 | 0:08 – 0:19 | Here are three simple, smooth waves: a low note, a middle note, and a high note. Add them together, point by point, and you get exactly that messy wave. |
| 3 | 0:19 – 0:27 | The Fourier transform does the reverse. It takes the messy wave and finds the simple waves hidden inside it. |
| 4 | 0:27 – 0:37 | Each simple wave becomes one bar. Where the bar sits tells you the frequency, and how tall it is tells you how strong it is. |
| 5 | 0:37 – 0:46 | Now remove one bar, and the sound changes. That is how filters work: any sound is just a sum of sine waves. |

## Visual notes

1. **The messy wave.** A complex waveform draws itself left to right across a dark screen; a faint pulse or glow hints at structure hidden inside.
2. **Building it up.** Three clean sine waves (low, mid, high), each in its own color, stack vertically; they slide together and sum point by point, with a vertical scan line showing the addition, reproducing the exact messy wave from scene 1.
3. **Taking it apart.** The process runs in reverse: the messy wave passes through a "Fourier transform" box and splits back into the three colored sine waves.
4. **The spectrum.** Each sine wave collapses into a colored bar on a frequency axis (low → high, left → right); bar height matches the wave's amplitude, with "frequency" and "strength" labels pointing to position and height.
5. **Filtering.** One bar (e.g. the high note) fades out; the reconstructed waveform above visibly smooths as that component disappears, ending on the caption "Any sound = a sum of sine waves."
