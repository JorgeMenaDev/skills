#!/usr/bin/env python3
"""Upload evidence files (screenshots, GIFs, short videos) to the public `evidence` R2 bucket.

Usage: upload.py <file>... --prefix <repo>/<pr>
Needs R2_EVIDENCE_TOKEN (a Cloudflare API token with Workers R2 Storage: Edit).
Prints one Markdown line per file: an image for PNG/JPEG/GIF/WebP, a link for anything else.
Files expire after 90 days (bucket lifecycle rule).
"""
import argparse
import mimetypes
import os
import pathlib
import sys
import urllib.parse
import urllib.request

ACCOUNT = os.environ.get("R2_EVIDENCE_ACCOUNT", "c89fa678a8b9c2955ce4ab7cd3f32366")
BUCKET = os.environ.get("R2_EVIDENCE_BUCKET", "evidence")
PUBLIC = os.environ.get("R2_EVIDENCE_PUBLIC", "https://pub-552a8933f14c4c9ba4a0c7e6b429ebd8.r2.dev")
INLINE = {"image/png", "image/jpeg", "image/gif", "image/webp"}


def upload(path: pathlib.Path, prefix: str, token: str) -> str:
    key = f"{prefix.strip('/')}/{path.name}"
    kind = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/r2/buckets/{BUCKET}/objects/{urllib.parse.quote(key)}"
    request = urllib.request.Request(
        url, data=path.read_bytes(), method="PUT",
        headers={"Authorization": f"Bearer {token}", "Content-Type": kind},
    )
    urllib.request.urlopen(request).read()
    public = f"{PUBLIC}/{urllib.parse.quote(key)}"
    return f"![{path.stem}]({public})" if kind in INLINE else f"[{path.name}]({public})"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="+", type=pathlib.Path)
    parser.add_argument("--prefix", required=True, help="folder in the bucket, e.g. arketix-control/188")
    args = parser.parse_args()
    token = os.environ.get("R2_EVIDENCE_TOKEN")
    if not token:
        print("R2_EVIDENCE_TOKEN is not set: ask whoever runs this session for the evidence upload token.", file=sys.stderr)
        return 2
    for path in args.files:
        print(upload(path, args.prefix, token))
    return 0


if __name__ == "__main__":
    sys.exit(main())
