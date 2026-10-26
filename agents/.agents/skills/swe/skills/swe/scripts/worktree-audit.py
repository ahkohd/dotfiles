#!/usr/bin/env python3
"""Read-only Git worktree audit with explicitly supplied, harness-neutral activity."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import time

PR_LIMIT = 1000


def run(*args, cwd=None, input_text=None):
    try:
        result = subprocess.run(args, cwd=cwd, input=input_text.encode() if input_text is not None else None, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    except OSError:
        return None
    return result.stdout.decode(errors='replace').strip() if result.returncode == 0 else None


def timestamp(value):
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return dt.timestamp() if dt.tzinfo else None
    except (AttributeError, TypeError, ValueError):
        return None


def classify(*, dirty, merged, remote, pr, activity, observed_at, now):
    if dirty != 'clean':
        return 'hold-wip' if dirty.startswith('wip:') else 'hold-untracked'
    if pr in ('open', 'draft'):
        return 'hold-open-pr'
    if remote != 'pushed':
        return 'hold-unpushed'
    if activity.get('active') is True or activity.get('pinned') is True:
        return 'hold-active'
    if (observed_at is None or not 0 <= now - observed_at <= 300
            or activity.get('active') is not False or activity.get('pinned') is not False):
        return 'verify-activity'
    last = timestamp(activity.get('lastActivity'))
    if last is not None and now - last <= 4 * 86400:
        return 'verify-recent-chat'
    return 'safe-candidate' if merged else 'review'


def preservation_holds(path, worktree):
    holds = []
    if 'locked' in worktree:
        holds.append('hold-git-lock')
    ignored = run('git', 'ls-files', '--others', '--ignored', '--exclude-standard', '-z', cwd=path)
    index = run('git', 'ls-files', '--stage', '-z', cwd=path)
    flags = run('git', 'ls-files', '-v', '-z', cwd=path)
    reflog = run('git', 'reflog', 'show', '--format=%H', 'HEAD', cwd=path)
    if ignored is None or index is None or flags is None or reflog is None:
        holds.append('verify-preserved-state')
    if flags and any(entry and (entry[0] == 'S' or entry[0].islower()) for entry in flags.split('\0')):
        holds.append('hold-index-flags')
    if ignored:
        holds.append('hold-ignored')
    if index and any(entry.startswith('160000 ') for entry in index.split('\0')):
        holds.append('hold-submodule')
    if reflog:
        unreachable = run('git', 'rev-list', '--stdin', '--not', '--all', cwd=path, input_text=reflog + '\n')
        if unreachable is None:
            holds.append('verify-preserved-state')
        elif unreachable:
            holds.append('hold-reflog')
    return holds


def worktrees(repo):
    data = subprocess.check_output(['git', 'worktree', 'list', '--porcelain', '-z'], cwd=repo)
    rows, row = [], {}
    for field in data.decode(errors='surrogateescape').split('\0'):
        if not field:
            if row:
                rows.append(row)
                row = {}
        else:
            key, _, value = field.partition(' ')
            row[key] = value
    if row:
        rows.append(row)
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('-b', '--base')
    parser.add_argument('--activity', type=Path, help='JSON with observedAt and worktrees keyed by absolute path; each row has active, pinned and optional lastActivity')
    parser.add_argument('--transcripts', type=Path, action='append', default=[], help='explicitly scoped JSONL directory; detects recent use, never proves inactivity')
    parser.add_argument('--json', action='store_true')
    parser.add_argument('repo', nargs='?', default='.')
    args = parser.parse_args()
    repo = Path(args.repo).resolve()
    base = args.base
    if not base:
        candidates = [run('git', 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD', cwd=repo), 'origin/main', 'origin/master']
        base = next((ref for ref in candidates if ref and run('git', 'rev-parse', '--verify', ref + '^{commit}', cwd=repo)), None)
    if not base or not run('git', 'rev-parse', '--verify', base + '^{commit}', cwd=repo):
        parser.error('no valid base; pass -b <ref>. Refresh remote refs separately before making deletion decisions')
    activity = json.loads(args.activity.read_text()) if args.activity else {}
    observed = timestamp(activity.get('observedAt'))
    states = activity.get('worktrees', {})
    if not isinstance(states, dict) or any(not isinstance(value, dict) for value in states.values()):
        parser.error('activity.worktrees must map paths to activity objects')
    pr_text = run('gh', 'pr', 'list', '--state', 'all', '--limit', str(PR_LIMIT), '--json', 'number,state,headRefName,isDraft,headRefOid,baseRefName', cwd=repo)
    prs = json.loads(pr_text) if pr_text else []
    histories = []
    for directory in args.transcripts:
        if not directory.is_dir():
            parser.error(f'transcript directory does not exist: {directory}')
        for path in directory.rglob('*.jsonl'):
            if not path.is_symlink():
                histories.append((path.stat().st_mtime, path.read_text(errors='replace')))
    now, result = time.time(), []
    for wt in worktrees(repo)[1:]:
        path = wt['worktree']
        head = wt.get('HEAD', '')
        branch = wt.get('branch', '').removeprefix('refs/heads/')
        status = run('git', 'status', '--porcelain', '--untracked-files=all', cwd=path)
        if status is None:
            dirty = 'unknown'
        elif not status:
            dirty = 'clean'
        else:
            tracked = sum(not line.startswith('??') for line in status.splitlines())
            dirty = f'wip:{tracked}' if tracked else f'scratch:{len(status.splitlines())}'
        remote_head = run('git', 'rev-parse', '--verify', f'refs/remotes/origin/{branch}', cwd=repo) if branch else None
        remote = 'pushed' if remote_head == head else 'no-remote' if remote_head is None else 'unpublished'
        matching_prs = [row for row in prs if row['headRefName'] == branch]
        open_pr = next((row for row in matching_prs if row['state'] == 'OPEN'), None)
        # A squash merge counts only for this exact head and the requested base.
        merged_pr = next((row for row in matching_prs if row['state'] == 'MERGED'
                          and row.get('headRefOid') == head
                          and row.get('baseRefName') == base.removeprefix('origin/')), None)
        pr = open_pr or merged_pr or next(iter(matching_prs), None)
        state = 'draft' if open_pr and open_pr.get('isDraft') else pr['state'].lower() if pr else 'unknown'
        ancestor = subprocess.run(['git', 'merge-base', '--is-ancestor', head, base], cwd=repo, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
        merged = ancestor or merged_pr is not None
        current = dict(states.get(path, {}))
        recent = max((mtime for mtime, text in histories if path + '/' in text or path + '"' in text), default=0)
        recorded = timestamp(current.get('lastActivity')) or 0
        if recent > recorded:
            current['lastActivity'] = datetime.fromtimestamp(recent, timezone.utc).isoformat()
        bucket = classify(dirty=dirty, merged=merged, remote=remote, pr=state, activity=current, observed_at=observed, now=now)
        holds = preservation_holds(path, wt)
        if holds:
            bucket = holds[0]
        if (pr_text is None or len(prs) >= PR_LIMIT) and bucket == 'safe-candidate':
            bucket = 'verify-pr-state'
        size = run('du', '-sk', path)
        head_time = run('git', 'show', '-s', '--format=%ct', head, cwd=repo)
        result.append(dict(sizeKiB=int(size.split()[0]) if size else None, ageDays=int((now-int(head_time))/86400) if head_time else None, merged=merged, dirty=dirty, remote=remote, pr=f"#{pr['number']}/{state}" if pr else state, lastChat=current.get('lastActivity'), preservationHolds=holds, bucket=bucket, worktree=path))
    result.sort(key=lambda row: row['sizeKiB'] or 0, reverse=True)
    if args.json:
        print(json.dumps({'base': base, 'worktrees': result, 'warning': 'Candidates are advice, not deletion permission. Local refs may be stale; merged PRs must match the exact head and base.'}, indent=2))
    else:
        print(f'# base: {base}; local refs only; no deletion authorized')
        print('SIZE_KiB\tAGE_DAYS\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tPRESERVATION_HOLDS\tBUCKET\tWORKTREE')
        for row in result:
            print('\t'.join(str(v) for v in row.values()))


if __name__ == '__main__':
    main()
