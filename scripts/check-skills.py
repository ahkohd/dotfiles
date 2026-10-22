"""Run with python3 scripts/check-skills.py to check shared skill links."""
from pathlib import Path

home = Path.home()
source = Path(__file__).resolve().parents[1] / "agents/.agents/skills"
assert (home / ".agents/skills").resolve() == source
shared = external = 0
for folder in (".claude/skills", ".codex/skills", ".pi/agent/skills"):
    root = home / folder
    if not root.exists():
        continue
    for entry in root.iterdir():
        if entry.is_symlink():
            assert entry.exists(), f"Broken link: {entry}"
            if entry.resolve().is_relative_to(source):
                shared += 1
            else:
                external += 1
        else:
            assert not (entry / "SKILL.md").is_file(), f"Unshared skill: {entry}"
print(f"PASS: {shared} shared links, {external} externally managed links; no loose skill copies")
