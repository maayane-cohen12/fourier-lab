"""Generate narration audio for each scene in SCRIPT.md using Kokoro TTS.

Usage: .venv/Scripts/python.exe narrate.py
Outputs: public/audio/scene1.wav ... scene5.wav
"""

import re
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / "SCRIPT.md"
OUT_DIR = ROOT / "public" / "audio"

VOICE = "af_sarah"
SPEED = 0.9
LANG = "en-us"
EXPECTED_LINES = 5


def read_narration(path: Path) -> list[str]:
    """Return the Narration column of the table under '## Narration', in order."""
    text = path.read_text(encoding="utf-8")
    section = re.search(r"^## Narration\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    if not section:
        raise SystemExit("No '## Narration' section found in SCRIPT.md")

    lines = []
    for row in section.group(1).splitlines():
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        # Data rows start with the scene number; skip header and separator rows.
        if len(cells) >= 3 and cells[0].isdigit():
            lines.append(cells[-1])
    if len(lines) != EXPECTED_LINES:
        raise SystemExit(f"Expected {EXPECTED_LINES} narration lines, found {len(lines)}")
    return lines


def main() -> None:
    lines = read_narration(SCRIPT)
    kokoro = Kokoro(str(ROOT / "kokoro-v1.0.onnx"), str(ROOT / "voices-v1.0.bin"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0.0
    for i, line in enumerate(lines, start=1):
        samples, sample_rate = kokoro.create(line, voice=VOICE, speed=SPEED, lang=LANG)
        out = OUT_DIR / f"scene{i}.wav"
        sf.write(out, samples, sample_rate)
        duration = len(samples) / sample_rate
        total += duration
        print(f"scene{i}.wav: {duration:.2f}s")
    print(f"total: {total:.2f}s")


if __name__ == "__main__":
    main()
