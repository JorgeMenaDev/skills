#!/usr/bin/env python3
"""Compose the reactor layout: evidence left, pose right.

Usage: compose-reactor.py EVIDENCE POSE OUT.png --face CX CY D
                               [--head-px 580] [--split-x 762] [--head-top 48]

EVIDENCE fills the 1280x720 frame. POSE is a transparent-background reaction
pose; its head (centre CX,CY, diameter D in pose pixels, measured as in
face-lock.sh) is scaled to --head-px, its head-left anchored at --split-x and
its head-top at --head-top, so the pose is cropped by the right frame edge
while its face stays above the bottom fifth (the duration badge covers body
only). Output is a composited PNG; export the JPG with finish.sh.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

W, H = 1280, 720


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("evidence")
    ap.add_argument("pose")
    ap.add_argument("out")
    ap.add_argument("--face", nargs=3, type=int, required=True, metavar=("CX", "CY", "D"))
    ap.add_argument("--head-px", type=int, default=580)
    ap.add_argument("--split-x", type=int, default=762)
    ap.add_argument("--head-top", type=int, default=48)
    a = ap.parse_args()

    for label, p in (("evidence", a.evidence), ("pose", a.pose)):
        if not Path(p).is_file():
            print(f"compose-reactor: {label} not found: {p}", file=sys.stderr)
            sys.exit(1)

    plate = Image.open(a.evidence).convert("RGBA").resize((W, H), Image.Resampling.LANCZOS)
    pose = Image.open(a.pose).convert("RGBA")
    cx, cy, d = a.face
    if d <= 0:
        print("compose-reactor: face diameter must be positive", file=sys.stderr)
        sys.exit(2)
    s = a.head_px / d
    pose = pose.resize((round(pose.width * s), round(pose.height * s)), Image.Resampling.LANCZOS)
    x = round(a.split_x - (cx - d / 2) * s)
    y = round(a.head_top - (cy - d / 2) * s)
    plate.alpha_composite(pose, (x, y))
    plate.convert("RGB").save(a.out)
    print(f"{a.out} {W}x{H} scale={s:.3f} pose_at=({x},{y})")


if __name__ == "__main__":
    main()
