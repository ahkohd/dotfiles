import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  isPathInside,
  normalizeConfig,
  parseModelReference,
  safeProjectConfigPath,
  serializeRun,
  splitGlobPattern,
} from "./core.ts";

test("normalizes persisted settings", () => {
  assert.deepEqual(normalizeConfig({}).libraries, ["~/.claude/skills", "~/.pi/agent/skills", "~/.agents/skills"]);
  assert.deepEqual(
    normalizeConfig({
      model: " gpu0-oai/qwen3.6-27b ",
      thinkingLevel: "off",
      display: false,
      libraries: ["/docs", "/docs", ""],
    }),
    {
      model: "gpu0-oai/qwen3.6-27b",
      thinkingLevel: "off",
      display: false,
      libraries: ["/docs"],
    },
  );
});

test("rejects symlinked project configuration paths", async () => {
  const project = await mkdtemp(join(tmpdir(), "recall-project-"));
  const outside = await mkdtemp(join(tmpdir(), "recall-outside-"));

  try {
    await symlink(outside, join(project, ".pi"));
    await assert.rejects(safeProjectConfigPath(project, true), /must be a real directory/);

    await unlink(join(project, ".pi"));
    await mkdir(join(project, ".pi"));
    const outsideConfig = join(outside, "recall.json");
    await writeFile(outsideConfig, "{}\n");
    await symlink(outsideConfig, join(project, ".pi", "recall.json"));
    await assert.rejects(safeProjectConfigPath(project, true), /must not be a symbolic link/);

    await unlink(join(project, ".pi", "recall.json"));
    assert.equal(await safeProjectConfigPath(project, true), join(await realpath(project), ".pi", "recall.json"));
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("serializes useful run messages without recalling itself", () => {
  const result = serializeRun([
    { role: "user", content: "fix async Swift code" },
    { role: "custom", customType: "recall", content: "old recommendation" },
    { role: "assistant", content: [{ type: "thinking", thinking: "hidden" }, { type: "text", text: "I will inspect it." }] },
    { role: "toolResult", toolName: "read", content: [{ type: "text", text: "file contents" }] },
  ]);

  assert.equal(result, "[user]\nfix async Swift code\n\n[assistant]\nI will inspect it.\n\n[tool:read]\nfile contents");
});

test("checks library boundaries, globs, and model references", () => {
  assert.deepEqual(splitGlobPattern("/tmp/project/**/*.md"), { base: "/tmp/project", pattern: "**/*.md" });
  assert.deepEqual(splitGlobPattern("*.md"), { base: ".", pattern: "*.md" });
  assert.equal(splitGlobPattern("/tmp/project/README.md"), undefined);
  assert.equal(isPathInside("/docs/skills/one.md", "/docs/skills"), true);
  assert.equal(isPathInside("/docs/other.md", "/docs/skills"), false);
  assert.deepEqual(parseModelReference("gpu0-oai/qwen3.6-27b"), {
    provider: "gpu0-oai",
    modelId: "qwen3.6-27b",
  });
  assert.equal(parseModelReference("qwen3.6-27b"), undefined);
});
