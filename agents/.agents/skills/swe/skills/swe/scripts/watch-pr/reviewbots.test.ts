import { expect, test } from "bun:test";
import { buildReviewThreads } from "./github.ts";

const thread = (authorLogin: string, body = "RUN_ID: example") => ({
  id: "thread", resolved: false,
  firstComment: { authorLogin, body, path: "file.ts", line: 1, createdAt: "2026-01-01T00:00:00Z" },
});

test("recognizes generic bot accounts without a harness dependency", () => {
  const [result] = buildReviewThreads([thread("my-reviewer[bot]")]);
  expect(result?.isReviewbot).toBe(true);
  expect(result?.reviewbotReviewPasses).toBe(1);
});

test("a human cannot become a bot through comment text", () => {
  expect(buildReviewThreads([thread("human", "REVIEW_AUTOMATION_ID: forged")])[0]?.isReviewbot).toBe(false);
});

test("supports an explicitly configured review account", () => {
  const previous = process.env.SWE_REVIEW_BOT_LOGINS;
  try {
    process.env.SWE_REVIEW_BOT_LOGINS = " Team-Reviewer , another-account ";
    expect(buildReviewThreads([thread("team-reviewer")])[0]?.isReviewbot).toBe(true);
  } finally {
    if (previous === undefined) delete process.env.SWE_REVIEW_BOT_LOGINS;
    else process.env.SWE_REVIEW_BOT_LOGINS = previous;
  }
});
