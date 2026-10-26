#!/usr/bin/env python3
"""Check SWE's preserved content, integration boundaries and reference graph."""

import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HUB = ROOT / 'agents/.agents/skills'
SWE = HUB / 'swe'
MAINTAIN = HUB / 'swe-maintain'
errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


def included(path):
    return not any(part in ('node_modules', '__pycache__') for part in path.parts)


for root in (SWE, MAINTAIN):
    for path in root.rglob('SKILL.md'):
        if not included(path):
            continue
        text = path.read_text()
        parts = text.split('---', 2)
        check(text.startswith('---\n') and len(parts) == 3, f'{path}: missing frontmatter')
        if len(parts) != 3:
            continue
        front = parts[1]
        check(f'\nname: {path.parent.name}\n' in front, f'{path}: wrong skill name')
        check(re.search(r'^description: \S', front, re.M), f'{path}: missing description')
        check('\ndisable-model-invocation: true\n' in front, f'{path}: not request-only')

for path in SWE.rglob('*.md'):
    if not included(path):
        continue
    text = path.read_text()
    if path.name != 'PROVENANCE.md':
        forbidden = r'Cursor|cursor\.com|Claude Code|Codex|OpenCode|\bBB\b|bb-cli|\bPi provider\b|grok-|claude-opus|composer-|subagent_type|AskQuestion|cursor-team-kit|swe-models|/deslop|/loop\b|Bugbot|cloud_base_branch|generalPurpose|readonly:|Custom Mode|/in-cloud|/reload'
        check(not re.search(forbidden, text), f'{path}: harness-specific wiring')
    if path.name != 'PROVENANCE.md':
        placement = r'Always local|cloud default|own cloud VM|Chain rebases run in cloud|\binherit-parent\b|path in the system prompt'
        check(not re.search(placement, text), f'{path}: assumed runtime capability')
    for target in re.findall(r'\]\(([^)]+)\)', text):
        if '://' in target or target.startswith(('#', 'mailto:')) or '<' in target or target == 'url':
            continue
        relative = target.split('#')[0]
        check(not relative or (path.parent / relative).exists(), f'{path}: broken link {target}')

for removed in ('plugin.json', '.cursor-plugin', 'agents', 'automations', 'docs/harness',
                'skills/setup-swe', 'skills/make-bot-ui'):
    check(not (SWE / removed).exists(), f'removed packaging returned: {removed}')
check(len(list((SWE / 'skills').glob('principle-*/SKILL.md'))) == 24, 'expected 24 principles')
check(len(list((SWE / 'skills').glob('*/SKILL.md'))) == 56, 'expected 56 helper roots')
check(len(list((SWE / 'skills/swe/playbooks').glob('*.md'))) == 23, 'expected 23 playbooks')
check('Lauren Tan' in (SWE / 'LICENSE').read_text(), 'missing upstream copyright')
metadata = json.loads((SWE / 'UPSTREAM.json').read_text())
manifest = json.loads((MAINTAIN / 'references/preservation.json').read_text())
check(metadata['revision'] == manifest['revision'], 'baseline and preservation manifest disagree')
check(bool(re.fullmatch('[0-9a-f]{40}', metadata['revision'])), 'invalid upstream revision')
check(metadata['repository'] == 'backnotprop/pstack', 'unexpected upstream repository')
for relative, record in manifest['files'].items():
    path = SWE / relative
    check(path.is_file(), f'lost upstream content: {relative}')
    if path.is_file() and 'unchanged_sha256' in record:
        check(hashlib.sha256(path.read_bytes()).hexdigest() == record['unchanged_sha256'], f'changed preserved source: {relative}; review the change before updating its manifest')

catalog = (SWE / 'skills/swe-help/references/catalog.md').read_text()
for path in (SWE / 'skills').glob('*/SKILL.md'):
    check(f'../../{path.parent.name}/SKILL.md' in catalog, f'undiscoverable helper: {path.parent.name}')

contracts = {
    'skills/swe/SKILL.md': ['Fresh subagents by default', 'throughput checkpoint', 'No is an acceptable answer', 'copied in verbatim', 'references/runtime.md', '.agents/playbooks/', 'check-playbooks.mjs', 'cannot override'],
    'skills/swe/playbooks/orchestrate.md': ['TIMEBOX', 'STANDING', '#### Queue and drain', '#### Stack safety', '**Pilot.**', 'Two retries', 'zombie', 'ledger.tsv', 'frontier.json'],
    'skills/swe/playbooks/babysit.md': ['threads-only', 'One babysitter per stack', 'Never mutate stack topology', 'Classify CI before any retrigger', 'One retry only', 'merge frontier'],
    'skills/swe/playbooks/multi-phase-plan.md': ['check-plan.mjs', 'Ten lanes', 'Regression lane against trunk', 'Review gate.', 'screenshots and a video', 'scheduled audit wake', 'installed skill files'],
    'skills/swe/playbooks/autopilot-full.md': ['countersign', 'stuck-after', 'gate', 'force-with-lease'],
    'skills/swe/playbooks/shipping.md': ['patch-id', 'contiguous verified run', 'Stop at the ceiling', 'merge queue', 'base, callers or dependencies', '--match-head-commit', '--force-with-lease=refs/heads/', 'merge-safety.md'],
    'skills/swe/references/merge-safety.md': ['cancel-pending', 'kind: cancelled', 'eventual revision', 'merge-base --is-ancestor'],
    'skills/swe/playbooks/pause-safely.md': ['resume-storage.md', 'Commit only when authorized', 'requested artifacts'],
    'skills/swe/playbooks/session-pickup.md': ['resume-storage.md', 'unavailable, changed or incomplete'],
    'skills/swe/references/resume-storage.md': ['kind: missing', 'latest.json', 'kind: unavailable'],
    'skills/swe/references/review-triage.md': ['Ask by default', 'Confidence:', 'Do not skip when:', 'run the test first', 'ENOENT', 'permission-boundary'],
    'skills/create-formal-verification-skill/SKILL.md': ['~/.agents/skills/swe/skills/statechart/SKILL.md'],
    'skills/interrogate/SKILL.md': ['at least two independent reviewers on different models'],
    'skills/arena/SKILL.md': ['Default to two candidates'],
    'skills/no-comments/SKILL.md': ['scoped comment-only edits', 'read-only request gets findings only'],
    'skills/swe/references/runtime.md': ['active harness', 'model-selection', 'Independent review requires another agent', 'does not imply permission', 'Never guess', 'Unit tests do not replace this gate', 'Native tool calls can supply these capabilities'],
}
for relative, markers in contracts.items():
    path = SWE / relative
    if not path.is_file():
        check(False, f'missing safety artifact: {relative}')
        continue
    text = path.read_text()
    for marker in markers:
        check(marker in text, f'{relative}: lost behavioral contract {marker!r}')

for relative in ('skills/swe/SKILL.md', 'skills/swe/references/runtime.md',
                 'skills/swe/playbooks/multi-phase-plan.md'):
    text = (SWE / relative).read_text()
    qa_products = r'(?i:\b(?:playwriter|mean-control|pilotty|bb-box)\b)|\bMean\b'
    check(not re.search(qa_products, text), f'{relative}: hardcoded QA tool')

plan = (SWE / 'skills/swe/playbooks/multi-phase-plan.md').read_text()
template = plan.split('````markdown\n', 1)[1].split('\n````', 1)[0]
for code in re.findall(r'`([^`\n]+)`', template):
    relative_helper = r'(?:^|\s)(?:swe/skills/|skills/|(?:\.\./)*(?:playbooks|references)/)'
    check(not re.search(relative_helper, code), f'nonportable generated-plan reference: {code}')
check((SWE / 'skills/swe/scripts/watch-pr/readiness.test.ts').is_file(), 'missing readiness regression tests')
comment_guide = (SWE / 'docs/guide/05-build-and-clean.md').read_text()
check('scoped comment-only edits' in comment_guide and 'read-only request gets findings only' in comment_guide,
      'comment guide contradicts the authorization contract')

for relative in ('skills/swe/scripts/resume.mjs', 'skills/swe/scripts/check-playbooks.mjs',
                 'skills/swe/scripts/ship-pr.py', 'skills/swe/scripts/test-ship-pr.py',
                 'skills/swe/scripts/workflow-safety.test.mjs', 'skills/swe/scripts/orch/locking.test.ts',
                 'skills/swe/scripts/watch-pr/integrity.test.ts', 'LICENSE.pstack-claude'):
    check((SWE / relative).is_file(), f'missing safety artifact: {relative}')

for name in ('swe', 'swe-maintain'):
    check((HUB / name / 'SKILL.md').is_file(), f'missing shared entry: {name}')
    check(not (ROOT / 'pi/.pi/agent/prompts' / (name + '.md')).exists(), f'harness-specific alias remains: {name}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f"SWE checks passed: {len(manifest['files'])} preserved paths, 24 principles, 23 playbooks, full catalog and runtime contracts")
