import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import net from "node:net";
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

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

test("start with an unusable state dir fails before spawning: no server, no temp dir left", async () => {
  rmSync(stateDir, { recursive: true });
  symlinkSync(path.join(tmp, "elsewhere"), stateDir);
  const port = await freePort();

  const result = drive("start", "--port", String(port));
  expect(result.code).toBe(1);
  expect(result.stderr).toContain(`${stateDir} is not a directory owned by you`);
  expect(await isListening(port)).toBe(false);
  expect(readdirSync(tmp).filter((name) => name.startsWith("taskboard-drive-"))).toEqual([]);
});

test("start that fails after the server is up kills it and removes its temp dir", async () => {
  chmodSync(stateDir, 0o500); // owner-only, so start accepts it, but the state file write fails
  const port = await freePort();

  const result = drive("start", "--port", String(port));
  chmodSync(stateDir, 0o700);
  expect(result.code).toBe(1);
  expect(result.stderr).toContain("EACCES");
  expect(await isListening(port)).toBe(false);
  expect(readdirSync(tmp).filter((name) => name.startsWith("taskboard-drive-"))).toEqual([]);
});

test("inherited object names are unknown commands", () => {
  for (const name of ["toString", "constructor", "__proto__"]) {
    const result = drive(name);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(`Unknown command "${name}"`);
  }
});
