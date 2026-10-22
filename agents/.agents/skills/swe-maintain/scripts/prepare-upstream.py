#!/usr/bin/env python3
"""Normalize upstream names into a new comparison directory, not the live SWE tree."""
import argparse
import json
from pathlib import Path
import re
import shutil

RENAMES = {
    "poteto-mode": "swe",
    "poteto-agent": "swe-agent",
    "poteto-help": "swe-help",
    "setup-pstack": "setup-swe",
    "pstack-models": "swe-models",
}
URL = re.compile(r"https?://[^\s<>\"`]+")


def rename(text):
    for old, new in RENAMES.items():
        text = text.replace(old, new)
    return text.replace("Poteto mode", "SWE").replace("/pstack:", "/swe:")


def transform(text):
    # Source URLs retain upstream names so attribution and citations still work.
    urls = []
    def protect(match):
        urls.append(match.group())
        return f"\x00SWE_URL_{len(urls) - 1}\x00"
    text = rename(URL.sub(protect, text))
    for i, url in enumerate(urls):
        text = text.replace(f"\x00SWE_URL_{i}\x00", url)
    return text


def prepare(source, output):
    source, output = source.resolve(), output.resolve()
    if output.exists() or output.is_relative_to(source) or source.is_relative_to(output):
        raise ValueError("Output must be a new directory outside the source tree")
    if not (source / "skills/poteto-mode/SKILL.md").is_file():
        raise ValueError("Source is not a pstack checkout")
    output.mkdir(parents=True)
    for item in sorted(source.rglob("*")):
        relative = item.relative_to(source)
        if ".git" in relative.parts:
            continue
        target = output / rename(str(relative))
        if item.is_symlink():
            raise ValueError(f"Review upstream symlink before importing: {relative}")
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        data = item.read_bytes()
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            target.write_bytes(data)
        else:
            text = transform(text)
            if str(relative) == "skills/poteto-mode/SKILL.md":
                text = re.sub(r"^description:.*$", "description: Software Engineering. Use /swe for deliberate engineering work with explicit principles and verification.", text, flags=re.M)
            if str(relative) in ("plugin.json", ".cursor-plugin/plugin.json"):
                manifest = json.loads(text)
                manifest["name"] = "swe"
                if "displayName" in manifest:
                    manifest["displayName"] = "SWE"
                text = json.dumps(manifest, indent=2) + "\n"
            target.write_text(text)
        shutil.copymode(item, target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.source, args.output)
