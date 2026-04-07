#!/usr/bin/env python3
"""Build a zip package for Chrome/Edge extension store submission.
Works on Windows, macOS, and Linux — requires only Python 3."""

import json, os, zipfile, sys

FILES = [
    "manifest.json",
    "background.js",
    "ai-summary.js",
    "bridge.js",
    "interceptor.js",
    "ExtPay.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "options.html",
    "options.css",
    "options.js",
]

DIRS = [
    "icons",
]

os.chdir(os.path.dirname(os.path.abspath(__file__)) or ".")

with open("manifest.json") as f:
    version = json.load(f)["version"]

outfile = f"power-automate-flow-extractor-v{version}.zip"

with zipfile.ZipFile(outfile, "w", zipfile.ZIP_DEFLATED) as zf:
    for path in FILES:
        if not os.path.exists(path):
            print(f"WARNING: {path} not found, skipping")
            continue
        zf.write(path)

    for d in DIRS:
        for root, _, files in os.walk(d):
            for fname in files:
                fpath = os.path.join(root, fname)
                zf.write(fpath)

size = os.path.getsize(outfile)
unit = "KB" if size < 1_048_576 else "MB"
display = size / 1024 if size < 1_048_576 else size / 1_048_576
print(f"Built: {outfile}")
print(f"Size:  {display:.1f} {unit}")
