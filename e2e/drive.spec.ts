import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// The drive CLI keeps its state in <os.tmpdir()>/taskboard-drive. Each test points TMPDIR at a
// fresh directory, so it never sees (or prunes) a real drive instance.
let tmp: string;
let stateDir: string;

test.beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "taskboard-e2e-drive-"));
  stateDir = path.join(tmp, "taskboard-drive");
  mkdirSync(stateDir);
});

test.afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function drive(...args: string[]) {
  const result = spawnSync("node", ["scripts/drive.mts", ...args], {
    env: { ...process.env, TMPDIR: tmp },
    encoding: "utf8",
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

// Above Linux's maximum pid_max (2^22), so never a live process.
const DEAD_PID = 4194305;

function writeState(port: number, content: string) {
  const file = path.join(stateDir, `${port}.json`);
  writeFileSync(file, content);
  return file;
}

test("a state file naming a dir that is not a drive temp dir is reported and the dir is never deleted", () => {
  const victim = path.join(tmp, "rv-victim");
  mkdirSync(victim);
  const file = writeState(1, JSON.stringify({ url: "x", port: 1, pid: DEAD_PID, db: "x", dir: victim }));

  const dryRun = drive("stop", "--dry-run");
  expect(dryRun.code).toBe(0);
  expect(dryRun.stderr).toContain(`Ignored invalid state file ${file}`);
  expect(existsSync(victim)).toBe(true);
  expect(existsSync(file)).toBe(true);

  const real = drive("stop");
  expect(real.code).toBe(0);
  expect(real.stderr).toContain(`Ignored invalid state file ${file}`);
  expect(existsSync(victim)).toBe(true);
  expect(existsSync(file)).toBe(false);
});

test("a stale instance is pruned by stop, but --dry-run deletes nothing", () => {
  const dir = mkdtempSync(path.join(tmp, "taskboard-drive-"));
  const file = writeState(2, JSON.stringify({ url: "x", port: 2, pid: DEAD_PID, db: path.join(dir, "app.db"), dir }));

  const dryRun = drive("stop", "--dry-run");
  expect(dryRun.code).toBe(0);
  expect(dryRun.stderr).toContain(`Would prune stale instance on port 2`);
  expect(existsSync(dir)).toBe(true);
  expect(existsSync(file)).toBe(true);

  const real = drive("stop");
  expect(real.code).toBe(0);
  expect(real.stderr).toContain(`Pruned stale instance on port 2`);
  expect(existsSync(dir)).toBe(false);
  expect(existsSync(file)).toBe(false);
});

test("a malformed state file is reported in one line and skipped; stop removes it, --dry-run keeps it", () => {
  const file = writeState(3, "{bad");

  const dryRun = drive("stop", "--dry-run");
  expect(dryRun.code).toBe(0);
  expect(dryRun.stderr.trim().split("\n")).toEqual([`Ignored invalid state file ${file}: not JSON`]);
  expect(dryRun.stdout.trim()).toBe("nothing running");
  expect(existsSync(file)).toBe(true);

  const real = drive("stop");
  expect(real.code).toBe(0);
  expect(real.stderr).toContain(`Ignored invalid state file ${file}: not JSON`);
  expect(existsSync(file)).toBe(false);
});

test("a state file with a pid that is not a process id is reported, not killed", () => {
  const dir = mkdtempSync(path.join(tmp, "taskboard-drive-"));
  const file = writeState(4, JSON.stringify({ url: "x", port: 4, pid: 1, db: "x", dir }));

  const result = drive("stop", "--dry-run");
  expect(result.code).toBe(0);
  expect(result.stderr).toContain(`Ignored invalid state file ${file}`);
  expect(existsSync(dir)).toBe(true);
});

test("a group-writable state dir left by an earlier version is tightened to 0700", () => {
  chmodSync(stateDir, 0o775);
  expect(drive("stop").code).toBe(0);
  expect(statSync(stateDir).mode & 0o777).toBe(0o700);
});

test("inherited object names are unknown commands", () => {
  for (const name of ["toString", "constructor", "__proto__"]) {
    const result = drive(name);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(`Unknown command "${name}"`);
  }
});
