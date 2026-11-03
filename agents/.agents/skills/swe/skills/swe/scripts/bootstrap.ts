import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const scriptsDirectory = import.meta.dirname;
const nodeModulesDirectory = join(scriptsDirectory, "node_modules");
const commanderPackagePath = join(
  nodeModulesDirectory,
  "commander",
  "package.json"
);
const installKeyPath = join(
  nodeModulesDirectory,
  ".swe-tools-install-key"
);

function currentInstallKey(): string {
  return createHash("sha256")
    .update(readFileSync(join(scriptsDirectory, "package.json")))
    .update("\0")
    .update(readFileSync(join(scriptsDirectory, "package-lock.json")))
    .digest("hex");
}

export function ensureDependenciesInstalled(): void {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 24 || (major === 24 && minor < 12)) {
    throw new Error("SWE tools require Node.js 24.12 or newer and npm on PATH");
  }
  const installKey = currentInstallKey();
  if (
    existsSync(commanderPackagePath) &&
    existsSync(installKeyPath) &&
    readFileSync(installKeyPath, "utf8").trim() === installKey
  ) {
    return;
  }

  const result = spawnSync(
    "npm",
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: scriptsDirectory, shell: process.platform === "win32" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(
      `npm ci exited with status ${result.status}`
    );
  }
  if (!existsSync(commanderPackagePath)) {
    throw new Error(
      "npm ci completed without installing commander"
    );
  }

  writeFileSync(installKeyPath, `${installKey}\n`);
}
