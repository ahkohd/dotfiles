import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "./cli.ts";
import { fakeReader, pendingCheck } from "./fakes.test-helper.ts";

const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));
const reader = fileURLToPath(new URL("./github.ts", import.meta.url));

function stalledCommand(program: string, executable = "gh", guardMilliseconds = 4000) {
  const directory = mkdtempSync(join(tmpdir(), "swe-deadline-"));
  const pidFile = join(directory, "pid");
  const terminatedFile = join(directory, "terminated");
  try {
    writeFileSync(join(directory, executable), `#!/usr/bin/env python3
import os, signal, time
from pathlib import Path
signal.signal(signal.SIGTERM, lambda *_: Path(${JSON.stringify(terminatedFile)}).write_text('received'))
Path(${JSON.stringify(pidFile)}).write_text(str(os.getpid()))
while True: time.sleep(1)
`, { mode: 0o700 });
    const result = spawnSync(process.execPath, ["-e", program], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
      timeout: guardMilliseconds,
      killSignal: "SIGKILL",
    });
    expect(result.error).toBeUndefined();
    expect(existsSync(pidFile)).toBe(true);
    expect(existsSync(terminatedFile)).toBe(true);
    const pid = Number(readFileSync(pidFile, "utf8"));
    expect(() => process.kill(pid, 0)).toThrow();
    return result;
  } finally {
    if (existsSync(pidFile)) {
      const pid = Number(readFileSync(pidFile, "utf8"));
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const [name, flags] of [
  ["single", ["--owner", "owner", "--repo", "repo", "--pr", "1"]],
  ["stack discovery", ["--owner", "owner", "--repo", "repo", "--pr", "1", "--stack"]],
  ["queued", ["--owner", "owner", "--repo", "repo", "--stack-prs", "1", "--queued-stack"]],
  ["context discovery", []],
  ["status only", ["--owner", "owner", "--repo", "repo", "--pr", "1", "--status-only"]],
] as const) {
  test(`watch deadline kills an uncooperative command during ${name}`, () => {
    const args = [...flags, "--timeout", "0.5", "--max-query-errors", "1"];
    const result = stalledCommand(`const {main} = await import(${JSON.stringify(cli)}); process.exitCode = await main(${JSON.stringify(args)});`);
    expect(result.status).toBe(5);
    const verdicts = result.stdout.trim().split("\n").map(line => JSON.parse(line));
    const last = verdicts.at(-1);
    expect(last.kind).toBe("TIMEOUT");
    expect(last.reason.failure.kind).toBe("command-timeout");
    expect(last.reason.failure.scope).toBe("watch");
  });
}

test("context discovery also bounds the git subprocess", () => {
  const result = stalledCommand(`const {main} = await import(${JSON.stringify(cli)}); process.exitCode = await main(['--pr', '1', '--timeout', '0.5']);`, "git");
  expect(result.status).toBe(5);
  expect(JSON.parse(result.stdout).kind).toBe("TIMEOUT");
});

test("disabled watch timeout still bounds an individual command", () => {
  const result = stalledCommand(`const {GhGitHubReader} = await import(${JSON.stringify(reader)});
try { await new GhGitHubReader().currentPr(null); process.exitCode = 1; }
catch (error) { console.log(JSON.stringify(error.failure)); }`, "gh", 35000);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ kind: "command-timeout", scope: "query", retryable: true });
}, 40000);

for (const flags of [[], ["--stack"], ["--queued-stack", "--stack-prs", "1"]]) {
  test(`discovery consumes the shared polling budget: ${flags.join(" ") || "single"}`, async () => {
    let now = 0;
    const deadlines: (number | null)[] = [];
    const client = fakeReader({ fastPath: { kind: "checks", checks: [pendingCheck()] } });
    const code = await main([...flags, "--timeout", "10", "--interval", "60"], {
      reader: {
        ...client,
        setDeadline: value => { deadlines.push(value); },
        originRepo: async () => { now = 8; return client.originRepo(); },
        currentPr: async pr => { now = 8; return client.currentPr(pr); },
      },
      clock: { now: () => now, observedAt: () => new Date(0).toISOString(), sleep: async seconds => { now += seconds; } },
      stdout: () => {}, stderr: () => {},
    });
    expect(code).toBe(5);
    expect(now).toBe(10);
    expect(deadlines).toEqual([10]);
  });
}

for (const method of [
  "checksFastPath(context)",
  "checkRollupPage(context, null)",
  "reviewThreadPage(context, null)",
  "commitRollups(context)",
]) {
  test(`transport applies the deadline to ${method}`, () => {
    const result = stalledCommand(`const {GhGitHubReader} = await import(${JSON.stringify(reader)});
const client = new GhGitHubReader(); client.setDeadline(performance.now()/1000 + 0.5);
const context = {owner:'owner', repo:'repo', number:1};
try { await client.${method}; process.exitCode = 1; }
catch (error) { console.log(JSON.stringify(error.failure)); }`);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).scope).toBe("watch");
  });
}
