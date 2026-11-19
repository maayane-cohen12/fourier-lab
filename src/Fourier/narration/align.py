"""Estimate when each narration word is spoken, for timing the animation.

Usage (from the repo root):
    .venv/Scripts/python.exe src/Fourier/narration/align.py
Reads:  SCRIPT.md (narration column) and public/audio/scene1.wav ... scene10.wav
Writes: src/Fourier/narration/words.json

The Kokoro model we use does not report phoneme timings, so this aligns the
text to the audio itself:
  1. Silent gaps in the audio are found from short-time energy.
  2. Each punctuation mark (, . : ; ? !) is a clause boundary. Boundaries
     are matched to silent gaps (Kokoro pauses at punctuation) by one global,
     in-order best fit: a gap should sit where phoneme counts put the mark
     in the speech, and longer gaps are preferred. Boundaries left without
     a gap keep the estimate and are flagged "snapped": false.
  3. Inside each clause, words are spread over the speech in proportion to
     their phoneme counts.
So clause-initial words are accurate to the pause (~10-20 ms); words in the
middle of a clause are estimates (typically within ~0.15 s).

Re-run after regenerating the audio with narrate.py.
"""

import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "SCRIPT.md"
AUDIO = ROOT / "public" / "audio"
OUT = Path(__file__).resolve().parent / "words.json"

FRAME = 0.01  # energy window, seconds
SILENCE_DB = -40.0  # below (peak - 40 dB) counts as silence
MIN_GAP = 0.04  # shortest silent run treated as a pause, seconds
SNAP_TOLERANCE = 0.8  # how far a gap may be from the estimate, seconds
SKIP_BOUNDARY_COST = 0.6  # cost of leaving a punctuation mark without a pause
LONG_GAP_BONUS = 1.0  # longer pauses are likelier to be punctuation
WORD_OVERHEAD = 1.5  # extra "phonemes" per word for transitions


def read_narration() -> list[str]:
    text = SCRIPT.read_text(encoding="utf-8")
    section = re.search(r"^## Narration\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    lines = []
    for row in section.group(1).splitlines():
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        if len(cells) >= 3 and cells[0].isdigit():
            lines.append(cells[-1])
    return lines


def silent_runs(audio: np.ndarray, sr: int) -> tuple[list[tuple[float, float]], float, float]:
    """Silent runs (start, end) inside the speech, and the speech start/end."""
    hop = int(FRAME * sr)
    n = len(audio) // hop
    rms = np.sqrt(np.mean(audio[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    voiced = db > db.max() + SILENCE_DB
    idx = np.flatnonzero(voiced)
    speech_start, speech_end = idx[0] * FRAME, (idx[-1] + 1) * FRAME
    runs, i = [], idx[0]
    while i <= idx[-1]:
        if not voiced[i]:
            j = i
            while j <= idx[-1] and not voiced[j]:
                j += 1
            if (j - i) * FRAME >= MIN_GAP:
                runs.append((i * FRAME, j * FRAME))
            i = j
        else:
            i += 1
    return runs, speech_start, speech_end


def align(line: str, audio: np.ndarray, sr: int, kokoro: Kokoro) -> dict:
    tokens = re.findall(r"[\w'’-]+[^\s\w]*", line)
    words = [re.sub(r"[^\w'’-]", "", t) for t in tokens]
    ends_clause = [bool(re.search(r"[,.:;?!]$", t)) for t in tokens]
    weights = [
        len(kokoro.tokenizer.phonemize(w, "en-us").replace(" ", "")) + WORD_OVERHEAD
        for w in words
    ]

    runs, s0, s1 = silent_runs(audio, sr)
    pause_total = sum(b - a for a, b in runs)
    rate = (s1 - s0 - pause_total) / sum(weights)  # seconds per weight unit

    # Clause boundaries: estimate, then snap to the nearest unused gap.
    clauses, start = [], 0
    for i, end in enumerate(ends_clause):
        if end or i == len(words) - 1:
            clauses.append((start, i))
            start = i + 1
    # Expected position of each boundary, as speech time (pauses excluded).
    speech_total = s1 - s0 - pause_total
    expected, acc = [], 0.0
    for a, b in clauses[:-1]:
        acc += sum(weights[a : b + 1]) * rate
        expected.append(acc)
    # Speech time elapsed before each gap.
    gap_pos, before = [], 0.0
    for g0, g1 in runs:
        gap_pos.append(g0 - s0 - before)
        before += g1 - g0

    # In-order best fit: dp[i][j] = cost of placing boundaries < i using gaps < j.
    nb, ng = len(expected), len(runs)
    inf = float("inf")
    dp = [[inf] * (ng + 1) for _ in range(nb + 1)]
    back = [[None] * (ng + 1) for _ in range(nb + 1)]
    for j in range(ng + 1):
        dp[0][j] = 0.0
    for i in range(1, nb + 1):
        for j in range(ng + 1):
            # boundary i-1 gets no gap
            if dp[i - 1][j] + SKIP_BOUNDARY_COST < dp[i][j]:
                dp[i][j] = dp[i - 1][j] + SKIP_BOUNDARY_COST
                back[i][j] = ("skip", j)
            # gap j-1 is not punctuation (e.g. a stop consonant)
            if j > 0 and dp[i][j - 1] < dp[i][j]:
                dp[i][j] = dp[i][j - 1]
                back[i][j] = ("ignore", j - 1)
            # boundary i-1 takes gap j-1
            if j > 0:
                d = abs(gap_pos[j - 1] - expected[i - 1])
                if d <= SNAP_TOLERANCE:
                    g_len = runs[j - 1][1] - runs[j - 1][0]
                    c = dp[i - 1][j - 1] + d - LONG_GAP_BONUS * g_len
                    if c < dp[i][j]:
                        dp[i][j] = c
                        back[i][j] = ("take", j - 1)
    assignment = [None] * nb
    i, j = nb, ng
    while i > 0:
        kind, jj = back[i][j]
        if kind == "take":
            assignment[i - 1] = jj
            i, j = i - 1, jj
        elif kind == "skip":
            i -= 1
        else:
            j = jj

    boundaries = []  # (end of clause, start of next clause, snapped)
    for bi, gi in enumerate(assignment):
        if gi is not None:
            boundaries.append((runs[gi][0], runs[gi][1], True))
        else:
            # Interpolate from the neighbouring speech time.
            t = s0 + expected[bi] + sum(
                runs[k][1] - runs[k][0] for k in range(ng) if gap_pos[k] < expected[bi]
            )
            boundaries.append((t, t, False))

    out_words, out_clauses = [], []
    for ci, (a, b) in enumerate(clauses):
        c0 = s0 if ci == 0 else boundaries[ci - 1][1]
        c1 = s1 if ci == len(clauses) - 1 else boundaries[ci][0]
        snapped = (ci == 0 or boundaries[ci - 1][2]) and (
            ci == len(clauses) - 1 or boundaries[ci][2]
        )
        out_clauses.append(
            {"text": " ".join(words[a : b + 1]), "start": round(c0, 3), "end": round(c1, 3), "snapped": snapped}
        )
        total = sum(weights[a : b + 1])
        t = c0
        for k in range(a, b + 1):
            d = (c1 - c0) * weights[k] / total
            out_words.append({"word": words[k], "start": round(t, 3), "end": round(t + d, 3)})
            t += d
    return {"words": out_words, "clauses": out_clauses, "gaps": len(runs)}


def main() -> None:
    lines = read_narration()
    kokoro = Kokoro(str(ROOT / "kokoro-v1.0.onnx"), str(ROOT / "voices-v1.0.bin"))
    result = {}
    for i, line in enumerate(lines, start=1):
        audio, sr = sf.read(AUDIO / f"scene{i}.wav")
        r = align(line, audio, sr, kokoro)
        result[f"scene{i}"] = {"text": line, **r}
        snapped = sum(c["snapped"] for c in r["clauses"])
        print(f"scene{i}: {len(r['clauses'])} clauses ({snapped} fully snapped), {r['gaps']} gaps")
        for c in r["clauses"]:
            flag = "" if c["snapped"] else "   <- estimated boundary"
            print(f"   {c['start']:6.2f}-{c['end']:6.2f}  {c['text']}{flag}")
    OUT.write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
