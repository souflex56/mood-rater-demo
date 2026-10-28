"""Rebuild the licensed excerpts from downloaded originals, with clip-relative fades.

Usage: python3 scripts/prepare-audio-excerpts.py /path/to/original-recordings
See public/audio/README.md for the original download URLs and recording licenses.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "chopin-nocturne-op9-no2-v2": ("chopin.ogg", 3.43, 2),
    "vivaldi-spring-allegro-v2": ("vivaldi.ogg", 0.70, 2),
    "kennedy-rice-speech-no-music-v1": ("kennedy.ogg", 480.0, 1),
    "zheng-qinwen-no-music-interview-v1": ("zheng-raw.webm", 55.44, 1),
}


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    source_dir = Path(sys.argv[1]).resolve()
    manifest_path = ROOT / "config/audio-library.json"
    manifest = json.loads(manifest_path.read_text())
    for clip in manifest["clips"]:
        filename, start, channels = SOURCES[clip["id"]]
        source = source_dir / filename
        if not source.is_file():
            raise SystemExit(f"Missing original recording: {source}")
    for clip in manifest["clips"]:
        filename, start, channels = SOURCES[clip["id"]]
        duration = clip["duration"]
        destination = ROOT / ("public" + clip["url"])
        # Normalize irregular archival timestamps, trim on the decoded timeline,
        # then reset again so boundary fades are relative to the excerpt.
        normalize = "asetpts=N/SR/TB," if filename in {"kennedy.ogg", "zheng-raw.webm"} else ""
        filters = (
            f"{normalize}atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d=0.015,afade=t=out:st={duration - .015}:d=0.015"
        )
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source_dir / filename), "-vn", "-map_metadata", "-1",
            "-af", filters, "-ar", "44100", "-ac", str(channels),
            "-c:a", "libmp3lame", "-b:a", "128k" if channels == 2 else "96k",
            "-metadata", "title=" + clip["title"]["en"],
            "-metadata", "artist=" + clip["credit"]["creator"],
            "-metadata", "copyright=" + clip["credit"]["license"],
            str(destination),
        ], check=True)
        clip["size"] = destination.stat().st_size
        print(f'{clip["id"]}: {duration} s, {clip["size"]} bytes')
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
