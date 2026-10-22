#!/usr/bin/env python3
from datetime import datetime, timezone
import importlib.util
from itertools import permutations
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('worktree-audit.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AuditTests(unittest.TestCase):
    def classify(self, **overrides):
        args = dict(dirty='clean', merged=True, remote='pushed', pr='merged',
                    activity={'active': False, 'pinned': False}, observed_at=999, now=1000)
        args.update(overrides)
        return audit.classify(**args)

    def test_unknown_activity_is_not_safe(self):
        self.assertEqual(self.classify(activity={}), 'verify-activity')
        self.assertEqual(self.classify(observed_at=None), 'verify-activity')
        self.assertEqual(self.classify(observed_at=0), 'verify-activity')
        self.assertEqual(self.classify(observed_at=1001), 'verify-activity')

    def test_active_pinned_and_recent_work_is_held(self):
        self.assertEqual(self.classify(activity={'active': True}), 'hold-active')
        self.assertEqual(self.classify(activity={'pinned': True}), 'hold-active')
        self.assertEqual(self.classify(activity={'active': False, 'pinned': False, 'lastActivity': '1970-01-01T00:15:00Z'}), 'verify-recent-chat')

    def test_untracked_and_unpublished_are_not_disposable(self):
        for dirty in ('wip:1', 'scratch:1', 'unknown'):
            self.assertNotEqual(self.classify(dirty=dirty), 'safe-candidate')
        for remote in ('no-remote', 'detached', 'unpublished'):
            self.assertEqual(self.classify(remote=remote), 'hold-unpushed')
        self.assertEqual(self.classify(pr='open'), 'hold-open-pr')
        self.assertEqual(self.classify(pr='draft'), 'hold-open-pr')
        self.assertEqual(self.classify(merged=False, pr='closed'), 'review')
        self.assertEqual(self.classify(), 'safe-candidate')

    def test_worktree_paths_with_spaces(self):
        with tempfile.TemporaryDirectory(prefix='swe audit ') as tmp:
            repo = Path(tmp) / 'repo with spaces'
            child = Path(tmp) / 'child with spaces'
            subprocess.run(['git', 'init', '-q', '-b', 'main', str(repo)], check=True)
            subprocess.run(['git', '-c', 'commit.gpgsign=false', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture', '--allow-empty'], cwd=repo, check=True)
            subprocess.run(['git', 'worktree', 'add', '-qb', 'child', str(child)], cwd=repo, check=True)
            self.assertEqual(audit.worktrees(repo)[1]['worktree'], str(child.resolve()))
            # No network calls: an unavailable forge must never authorize cleanup.
            real_run = audit.run
            def offline(*args, **kwargs):
                return None if args[0] == 'gh' else real_run(*args, **kwargs)
            with patch.object(audit, 'run', side_effect=offline), patch('sys.argv', ['audit', '-b', 'main', '--json', str(repo)]), patch('builtins.print') as output:
                audit.main()
                result = json.loads(output.call_args.args[0])
                self.assertEqual(len(result['worktrees']), 1)
                self.assertNotEqual(result['worktrees'][0]['bucket'], 'safe-candidate')
            self.assertTrue(child.exists())


class AuditIntegrationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='swe audit integration ')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.repo = self.root / 'repo'
        self.child = self.root / 'child with spaces'
        self.repo.mkdir()
        commands = self.root / 'bin'
        commands.mkdir()
        gh = commands / 'gh'
        gh.write_text('#!/bin/sh\n'
                      'test "$1 $2" = "pr list" || exit 64\n'
                      'test "${SWE_AUDIT_TEST_GH_FAIL:-0}" = 0 || exit 1\n'
                      'cat "$SWE_AUDIT_TEST_PRS_FILE"\n')
        gh.chmod(0o755)
        self.env = dict(os.environ, PATH=str(commands) + os.pathsep + os.environ['PATH'],
                        GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM='1')
        self.git('init', '-q', '-b', 'main')
        self.git('commit', '--allow-empty', '-qm', 'fixture')
        self.git('worktree', 'add', '-qb', 'topic', str(self.child))
        self.head = self.git('rev-parse', 'HEAD')
        self.git('update-ref', 'refs/remotes/origin/topic', self.head)
        self.activity = self.root / 'activity.json'
        self.activity.write_text(json.dumps({
            'observedAt': datetime.now(timezone.utc).isoformat(),
            'worktrees': {str(self.child): {'active': False, 'pinned': False}},
        }))

    def git(self, *args, cwd=None):
        return subprocess.check_output(
            ['git', '-c', 'commit.gpgsign=false', '-c', 'user.name=Test',
             '-c', 'user.email=test@example.invalid', *args],
            cwd=cwd or self.repo, env=self.env, stderr=subprocess.DEVNULL, text=True,
        ).strip()

    def pr(self, **overrides):
        return dict(dict(number=20, state='MERGED', headRefName='topic',
                         isDraft=False, headRefOid=self.head, baseRefName='main'), **overrides)

    def inspect(self, prs, *, unavailable=False):
        script = Path(__file__).with_name('worktree-audit.py')
        pr_file = self.root / 'prs.json'
        pr_file.write_text(json.dumps(prs) + '\n')
        result = subprocess.run(
            [sys.executable, str(script), '-b', 'main', '--activity', str(self.activity),
             '--json', str(self.repo)],
            env=dict(self.env, SWE_AUDIT_TEST_PRS_FILE=str(pr_file),
                     SWE_AUDIT_TEST_GH_FAIL=str(int(unavailable))),
            capture_output=True, text=True, check=True,
        )
        rows = json.loads(result.stdout)['worktrees']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['worktree'], str(self.child))
        return rows[0]

    def test_clean_merged_worktree_remains_untouched(self):
        refs = self.git('show-ref')
        worktrees = self.git('worktree', 'list', '--porcelain')
        row = self.inspect([self.pr()])
        self.assertEqual(row['bucket'], 'safe-candidate')
        self.assertEqual(self.git('show-ref'), refs)
        self.assertEqual(self.git('worktree', 'list', '--porcelain'), worktrees)
        self.assertTrue(self.child.exists())

    def test_hidden_untracked_files_are_held(self):
        notes = self.child / 'notes'
        notes.mkdir()
        draft = notes / 'draft.txt'
        draft.write_text('keep this uncommitted work\n')
        self.git('config', 'status.showUntrackedFiles', 'no')
        self.assertEqual(self.git('status', '--porcelain', cwd=self.child), '')
        row = self.inspect([self.pr()])
        self.assertEqual(row['bucket'], 'hold-untracked')
        self.assertEqual(row['dirty'], 'scratch:1')
        self.assertEqual(draft.read_text(), 'keep this uncommitted work\n')

    def test_open_and_draft_prs_win_in_every_order(self):
        closed = self.pr(number=22, state='CLOSED', baseRefName='other-base')
        for draft in (False, True):
            opened = self.pr(number=21, state='OPEN', isDraft=draft, baseRefName='release')
            for prs in permutations([closed, self.pr(), opened]):
                with self.subTest(draft=draft, order=[pr['number'] for pr in prs]):
                    row = self.inspect(prs)
                    self.assertEqual(row['bucket'], 'hold-open-pr')
                    self.assertEqual(row['pr'], '#21/draft' if draft else '#21/open')

    def test_squash_merge_requires_exact_head_and_base(self):
        self.git('commit', '--allow-empty', '-qm', 'topic change', cwd=self.child)
        self.head = self.git('rev-parse', 'HEAD', cwd=self.child)
        self.git('update-ref', 'refs/remotes/origin/topic', self.head)
        closed = self.pr(number=22, state='CLOSED')
        cases = [
            ([closed, self.pr()], True),
            ([self.pr(), closed], True),
            ([self.pr(headRefOid='0' * 40)], False),
            ([self.pr(baseRefName='release')], False),
            ([self.pr(headRefName='another-branch')], False),
            ([closed], False),
        ]
        for prs, merged in cases:
            with self.subTest(prs=prs):
                row = self.inspect(prs)
                self.assertEqual(row['merged'], merged)
                self.assertEqual(row['bucket'], 'safe-candidate' if merged else 'review')

    def test_full_pr_listing_requires_verification(self):
        prs = [self.pr(number=n, headRefName=f'other-{n}') for n in range(1000)]
        self.assertEqual(self.inspect(prs)['bucket'], 'verify-pr-state')

    def test_unavailable_forge_requires_verification(self):
        self.assertEqual(self.inspect([], unavailable=True)['bucket'], 'verify-pr-state')


if __name__ == '__main__':
    unittest.main()
