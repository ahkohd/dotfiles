#!/usr/bin/env python3
"""Prove preservation checks reject representative regressions in a scratch copy."""

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
hub = root / 'agents/.agents/skills'
with tempfile.TemporaryDirectory(prefix='swe-preservation-') as temporary:
    fixture = Path(temporary)
    target_hub = fixture / 'agents/.agents/skills'
    target_hub.mkdir(parents=True)
    for name in ('swe', 'swe-maintain'):
        shutil.copytree(hub / name, target_hub / name,
                        ignore=shutil.ignore_patterns('node_modules', '__pycache__'))
    (target_hub / 'model-selection').symlink_to(hub / 'model-selection', target_is_directory=True)
    (fixture / 'scripts').mkdir()
    checker = fixture / 'scripts/check-swe.py'
    shutil.copy2(root / 'scripts/check-swe.py', checker)

    def check(expected, marker=''):
        result = subprocess.run([sys.executable, str(checker)], capture_output=True, text=True)
        assert result.returncode == expected, result.stdout + result.stderr
        assert marker in result.stdout + result.stderr, result.stdout + result.stderr

    check(0)
    swe = target_hub / 'swe'
    tests = [
        ('skills/swe/scripts/worktree-audit.sh', None, 'lost upstream content'),
        ('skills/swe/playbooks/multi-phase-plan.md', lambda text: text.replace('Ten lanes', 'Risk-sized lanes'), 'lost behavioral contract'),
        ('skills/swarm/SKILL.md', lambda text: text + '\nPass `cloud_base_branch`.\n', 'harness-specific wiring'),
        ('skills/principle-prove-it-works/SKILL.md', lambda text: text + '\nChanged.\n', 'changed preserved source'),
        ('skills/swe-help/references/catalog.md', lambda text: text.replace('../../blast-radius/SKILL.md', '../../how/SKILL.md'), 'undiscoverable helper'),
        ('skills/swe/playbooks/multi-phase-plan.md', lambda text: text.replace('<absolute SWE skill root>/skills/swarm/SKILL.md', 'swe/skills/swarm/SKILL.md'), 'nonportable generated-plan reference'),
        ('skills/swe/playbooks/multi-phase-plan.md', lambda text: text.replace('its own isolated environment', 'its own cloud VM'), 'assumed runtime capability'),
        ('docs/guide/10-recipes-and-pitfalls.md', lambda text: text + '\nUse `inherit-parent`.\n', 'assumed runtime capability'),
        ('skills/swe/playbooks/autopilot-full.md', lambda text: text + '\nUse the store path in the system prompt.\n', 'assumed runtime capability'),
        ('docs/guide/05-build-and-clean.md', lambda text: text.replace('scoped comment-only edits', 'read-only review'), 'comment guide contradicts'),
        ('skills/swe/scripts/watch-pr/readiness.test.ts', None, 'missing readiness regression tests'),
        ('skills/swe/references/runtime.md', lambda text: text.replace('Unit tests do not replace this gate', 'Unit tests may replace this gate'), 'lost behavioral contract'),
    ]
    for tool in ('Playwriter', 'Mean', 'bb-box', 'pilotty'):
        tests.append(('skills/swe/references/runtime.md',
                      lambda text, tool=tool: text + f'\nAlways use {tool} for QA.\n',
                      'hardcoded QA tool'))
    for relative, transform, marker in tests:
        path = swe / relative
        original = path.read_bytes()
        if transform is None:
            path.unlink()
        else:
            path.write_text(transform(original.decode()))
        check(1, marker)
        path.write_bytes(original)
    check(0)
print(f'Preservation tests passed: {len(tests)} injected regressions rejected; installed files untouched')
