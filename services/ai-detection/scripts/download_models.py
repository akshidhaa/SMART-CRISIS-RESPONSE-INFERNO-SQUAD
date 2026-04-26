"""Download real YOLO / specialized weights from HuggingFace.

Run once on a fresh checkout (or Docker build step) to move past the
heuristic fallback path. Works offline-safe: any failing download is
logged but never aborts the whole script.

Usage:
    pip install huggingface_hub ultralytics
    python scripts/download_models.py [--dest ./models]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from config import HF_MODEL_URLS  # noqa: E402

# HF repo_id + filename, keyed by our detector names. Keep in sync with the
# placeholder URLs in config.HF_MODEL_URLS.
HF_TARGETS: dict[str, tuple[str, str]] = {
    "base": ("Ultralytics/YOLOv8", "yolov8n.pt"),
    "weapon": ("Ultralytics/YOLOv8-weapons", "yolov8-weapons.pt"),
    "ppe": ("keremberke/yolov8n-hard-hat-detection", "best.pt"),
    "fire": ("prithivMLmods/Fire-Detection-Siglip2", "model.safetensors"),
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch YOLO + specialized weights.")
    parser.add_argument(
        "--dest",
        default=str(HERE / "models"),
        help="Directory to download weights into.",
    )
    parser.add_argument(
        "--only",
        nargs="*",
        choices=list(HF_TARGETS),
        help="Subset of models to download (default: all).",
    )
    args = parser.parse_args()

    try:
        from huggingface_hub import hf_hub_download  # type: ignore
    except ImportError:
        print(
            "huggingface_hub is required. Install with:\n"
            "    pip install huggingface_hub",
            file=sys.stderr,
        )
        return 2

    dest = Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)

    targets = args.only or list(HF_TARGETS)
    failures: list[str] = []

    for name in targets:
        repo_id, filename = HF_TARGETS[name]
        url_hint = HF_MODEL_URLS.get(name, "")
        print(f"→ {name:<8} {repo_id}/{filename}")
        try:
            path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_dir=str(dest),
                local_dir_use_symlinks=False,
            )
            print(f"   ok  {path}")
        except Exception as e:
            failures.append(name)
            print(f"   FAIL  ({e.__class__.__name__}: {e})")
            if url_hint:
                print(f"         hint: {url_hint}")

    if failures:
        print(
            "\nSome downloads failed — the service will fall back to heuristics "
            f"for: {', '.join(failures)}",
            file=sys.stderr,
        )
        return 1

    print("\nAll weights cached. Restart the service to pick them up.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
