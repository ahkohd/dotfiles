#!/usr/bin/env python3
"""Check the public environment skill without loading private runtime values."""

import json
from pathlib import Path
import re
import sys


def check(root):
    errors = []
    for path in root.rglob('*'):
        if not path.is_file() or path.suffix not in ('.md', '.json'):
            continue
        text = path.read_text()
        if not text.isascii():
            errors.append(f'{path}: non-ASCII text')
        if re.search(r'[\w.%+*\-]+@[\w.\-]+\.[A-Za-z]{2,}\b', text):
            errors.append(f'{path}: literal email identity; use runtime variables')
        if re.search(r'\b(?:AGENT_(?:EMAIL_DOMAIN|GMAIL_ADDRESS|BROWSER_PROFILE)|LINEAR_API_TOKEN)\s*=\s*\S+', text):
            errors.append(f'{path}: identity or token assignment belongs in private configuration')
        if re.search(r'\blin_api_[A-Za-z0-9]+\b', text):
            errors.append(f'{path}: literal Linear token belongs in private configuration')
        if path.suffix == '.md':
            for target in re.findall(r'\]\(([^)]+)\)', text):
                if '://' not in target and not (path.parent / target).exists():
                    errors.append(f'{path}: broken reference {target}')
    body = (root / 'SKILL.md').read_text()
    for marker in ('name: agent-environment', 'AGENT_EMAIL_DOMAIN', 'AGENT_GMAIL_ADDRESS',
                   'without printing', 'request configuration', 'Keep this small',
                   'Linear organizations', 'Linearis', 'LINEAR_API_TOKEN',
                   'minimal read-only identity check', 'Do not silently fall back',
                   'Authentication does not authorize ticket edits or comments',
                   '## Browser profiles', 'AGENT_BROWSER_PROFILE', 'BB global default',
                   'ask which profile to use', 'Do not silently choose another profile',
                   'profile name does not establish identity or authorize actions'):
        if marker not in body:
            errors.append(f'SKILL.md: missing contract {marker}')
    cases = json.loads((root / 'evals/evals.json').read_text())
    assert cases['skill_name'] == 'agent-environment'
    assert cases['evals'], 'missing evaluation cases'
    assert len({case['id'] for case in cases['evals']}) == len(cases['evals'])
    assert all(case['prompt'] and case['expected_output'] and case['expectations'] for case in cases['evals'])
    return errors


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'agents/.agents/skills/agent-environment'
    errors = check(root)
    if errors:
        raise SystemExit('\n'.join(errors))
    print('PASS: environment skill privacy, references, contracts and evaluation structure')
