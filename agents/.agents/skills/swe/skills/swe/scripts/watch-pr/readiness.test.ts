import { describe, expect, it } from "bun:test";
import { fakeReader } from "./fakes.test-helper.ts";
import { classifyPr, readSnapshot, runQueued, runSimple, selectTierMajorStackDecision } from "./policy.ts";
import { renderJson, renderPretty, renderStatusTable } from "./render.ts";
import type { PullRequestFacts } from "./types.ts";
import { parsePrNumber } from "./types.ts";

const context = (number: number) => ({ owner: "owner", repo: "repo", number: parsePrNumber(number) });
const options = { interval: 10, sweepInterval: 300, timeout: 30, maxQueryErrors: 5, allowDraft: false };
const cases: { name: string; facts: Partial<PullRequestFacts>; reason: string; label: string; action: string }[] = [
  { name: "approval required", facts: { reviewDecision: "REVIEW_REQUIRED" }, reason: "review-required", label: "approval required", action: "obtain the required approval" },
  { name: "blocked with approval required", facts: { mergeStateStatus: "BLOCKED", reviewDecision: "REVIEW_REQUIRED" }, reason: "review-required", label: "approval required", action: "obtain the required approval" },
  { name: "blocked despite passing CI", facts: { mergeStateStatus: "BLOCKED" }, reason: "github-blocked", label: "GitHub blocked", action: "inspect GitHub's remaining merge requirements" },
  { name: "unknown mergeability", facts: { mergeable: "UNKNOWN" }, reason: "mergeability-unknown", label: "mergeability unknown", action: "query mergeability again" },
  { name: "unknown merge state", facts: { mergeStateStatus: "UNKNOWN" }, reason: "mergeability-unknown", label: "mergeability unknown", action: "query mergeability again" },
  { name: "both merge fields unknown", facts: { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" }, reason: "mergeability-unknown", label: "mergeability unknown", action: "query mergeability again" },
  { name: "base out of date", facts: { mergeStateStatus: "BEHIND" }, reason: "base-out-of-date", label: "base out of date", action: "update the branch through its authorized owner" },
];

async function snapshot(facts: Partial<PullRequestFacts>, number = 1) {
  return readSnapshot({ reader: fakeReader({ facts }), context: context(number), pendingHistory: "include", allowDraft: false });
}

describe("merge gates independent of CI", () => {
  for (const entry of cases) {
    it(`${entry.name} blocks single, stack and queued watchers`, async () => {
      for (const mode of ["single", "stack", "queued-stack"] as const) {
        const dependencies = {
          reader: fakeReader({ facts: entry.facts }),
          clock: {
            now: () => 0,
            observedAt: () => "2026-10-22T00:00:00Z",
            async sleep() { throw new Error("a merge gate must not become a merge-queue wait"); },
          },
          emit() {},
        };
        const result = mode === "queued-stack"
          ? await runQueued({ dependencies, contexts: [context(1)], options })
          : await runSimple({ dependencies, contexts: [context(1)], mode, statusOnly: false, options });
        expect(result).toMatchObject({ kind: "BLOCKER", exitCode: 6, blocker: { kind: "merge-gate", reason: entry.reason } });
        expect(JSON.parse(renderJson(result))).toMatchObject({ kind: "BLOCKER", blocker: { reason: entry.reason } });
        expect(renderPretty(result)).toContain(entry.action);
      }
    });

    it(`${entry.name} is visible in status and cannot clear an upstack PR`, async () => {
      const row = await snapshot(entry.facts, 2);
      expect(renderStatusTable([row])).toContain(entry.label);
      expect(selectTierMajorStackDecision([await snapshot({}), row])).toMatchObject({
        kind: "blocker", blocker: { pr: { number: 2 }, reason: entry.reason },
      });
    });

    it(`allow-draft does not waive ${entry.name}`, async () => {
      const row = await snapshot({ ...entry.facts, isDraft: true });
      expect(classifyPr(row, true)).toMatchObject({ kind: "blocker", blocker: { reason: entry.reason } });
    });
  }

  for (const reviewDecision of ["APPROVED", null] as const) {
    it(`keeps a known mergeable PR ready with review decision ${reviewDecision}`, async () => {
      const row = await snapshot({ reviewDecision });
      expect(classifyPr(row).kind).toBe("ready");
      expect(selectTierMajorStackDecision([row]).kind).toBe("clear");
    });
  }

  it("allow-draft still permits verification of an otherwise clear draft", async () => {
    const row = await snapshot({ isDraft: true, mergeStateStatus: "DRAFT" });
    expect(classifyPr(row)).toMatchObject({ kind: "blocker", blocker: { reason: "draft-pr" } });
    expect(classifyPr(row, true)).toMatchObject({ kind: "ready", pr: { proof: { gate: { draft: "draft-allowed" } } } });
  });
});
