import { expect, test } from 'bun:test';
import { buildReviewThreads, parseReviewThreadPage, resolveChecks } from './github.ts';
import { fakeReader, pendingCheck } from './fakes.test-helper.ts';
import { classifyPr, readSnapshot, runQueued, runSimple } from './policy.ts';
import { parsePrNumber, type PullRequestFacts } from './types.ts';

const context = { owner: 'owner', repo: 'repo', number: parsePrNumber(1) };
const options = { interval: 10, sweepInterval: 30, timeout: 20, maxQueryErrors: 5, allowDraft: false };

for (const [field, value] of Object.entries({ headRefOid: 'new-head', baseRefOid: 'new-base', baseRefName: 'other', headRefName: 'other', state: 'CLOSED', mergedAt: '2026-10-26T00:00:00Z', reviewDecision: 'REVIEW_REQUIRED', isDraft: true, mergeable: 'UNKNOWN', mergeStateStatus: 'BEHIND' })) {
  test(`rejects a snapshot when ${field} changes during reads`, async () => {
    const reader = fakeReader();
    const read = reader.pullRequest.bind(reader);
    let calls = 0;
    reader.pullRequest = async requested => {
      const facts = await read(requested);
      return ++calls === 1 ? facts : { ...facts, [field]: value } as PullRequestFacts;
    };
    await expect(readSnapshot({ reader, context, pendingHistory: 'include', allowDraft: false })).rejects.toMatchObject({ failure: { kind: 'snapshot-changed' } });
  });
}

test('ready evidence records both revisions and destination', async () => {
  const row = await readSnapshot({ reader: fakeReader(), context, pendingHistory: 'include', allowDraft: false });
  expect(classifyPr(row)).toMatchObject({ kind: 'ready', pr: { proof: { revision: { headRefOid: 'head', baseRefOid: 'base', baseRefName: 'main', context } } } });
});

test('unreported checks never become successful checks', async () => {
  await expect(resolveChecks(fakeReader({ fastPath: { kind: 'checks', checks: [] } }), context)).rejects.toMatchObject({ failure: { kind: 'checks-unavailable' } });
});

for (const mode of ['single', 'stack', 'queued-stack'] as const) {
  test(`${mode} times out rather than declaring unreported checks ready`, async () => {
    let now = 0;
    const dependencies = {
      reader: fakeReader({ fastPath: { kind: 'checks', checks: [] } }),
      clock: { now: () => now, observedAt: () => new Date(now * 1000).toISOString(), async sleep(seconds: number) { now += seconds; } },
      emit() {},
    };
    const result = mode === 'queued-stack'
      ? await runQueued({ dependencies, contexts: [context], options })
      : await runSimple({ dependencies, contexts: [context], mode, statusOnly: false, options });
    expect(result.kind).toBe('TIMEOUT');
    expect(now).toBe(20);
  });
}

test('original external markers retain three distinct review passes', () => {
  const saved = process.env.SWE_REVIEW_BOT_LOGINS;
  try {
    delete process.env.SWE_REVIEW_BOT_LOGINS;
    const threads = ['one', 'two', 'three'].map(id => ({ id, resolved: false, firstComment: { authorLogin: 'cursor', body: `CURSOR_AUTOMATION_ID: ${id} severity high`, path: 'fixture.ts', line: 1, createdAt: '2026-10-26T00:00:00Z' } }));
    for (const configured of [false, true]) {
      if (configured) process.env.SWE_REVIEW_BOT_LOGINS = 'cursor';
      expect(buildReviewThreads(threads).map(row => row.reviewbotReviewPasses)).toEqual([3, 3, 3]);
    }
    expect(buildReviewThreads(threads.map(row => ({ ...row, firstComment: { ...row.firstComment, authorLogin: 'human', body: 'review' } }))).every(row => !row.isReviewbot)).toBe(true);
  } finally {
    if (saved === undefined) delete process.env.SWE_REVIEW_BOT_LOGINS;
    else process.env.SWE_REVIEW_BOT_LOGINS = saved;
  }
});

test('original review automation check names retain their running signal', async () => {
  const reader = fakeReader({ fastPath: { kind: 'checks', checks: [pendingCheck('Bugbot')] } });
  const row = await readSnapshot({ reader, context, pendingHistory: 'omit', allowDraft: false });
  expect(row).toMatchObject({ kind: 'open', reviewAutomationRunning: true });
});

test('missing next-page cursor cannot silently truncate review evidence', () => {
  expect(() => parseReviewThreadPage({ data: { repository: { pullRequest: { reviewThreads: { nodes: [], pageInfo: { hasNextPage: true, endCursor: null } } } } } })).toThrow();
});
