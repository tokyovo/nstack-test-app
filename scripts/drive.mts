// Usage: npm run drive -- <start|seed|screens|check|stop> [options]   (npm run drive -- --help)
// Starts, seeds, screenshots, health-checks and stops isolated copies of the app.
// Each copy runs the production build on its own port with its own temp database, so the dev
// database (data/) is never touched. Instance state lives in <tmpdir>/taskboard-drive/<port>.json.
import { chromium, type Page } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { DEMO_EMAIL, seed, signedInPage, type Seeded } from "./seed-app.mts";

const STATE_DIR = path.join(os.tmpdir(), "taskboard-drive");
const NEXT_BIN = path.join("node_modules", ".bin", "next");
const READY_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 10_000;

type Instance = { url: string; port: number; pid: number; db: string; dir: string };

/** A failure the user can act on; `code` is the exit code (1 failed, 2 bad usage). */
class DriveError extends Error {
  readonly code: 1 | 2;
  constructor(message: string, code: 1 | 2 = 1) {
    super(message);
    this.code = code;
  }
}

// ---------- instances ----------

function stateFile(port: number) {
  return path.join(STATE_DIR, `${port}.json`);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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

function removeInstanceFiles(instance: Instance) {
  rmSync(instance.dir, { recursive: true, force: true });
  rmSync(stateFile(instance.port), { force: true });
}

/** A temp dir `start` could have made: a direct child of the OS temp dir named taskboard-drive-*. */
function isDriveTempDir(dir: unknown): dir is string {
  return (
    typeof dir === "string" &&
    path.resolve(dir) === dir &&
    path.dirname(dir) === os.tmpdir() &&
    path.basename(dir).startsWith("taskboard-drive-")
  );
}

/** The instance a state file describes, or why it cannot be trusted. */
function parseStateFile(file: string): Instance | string {
  let data: Partial<Record<keyof Instance, unknown>>;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return "not JSON";
  }
  const { url, port, pid, db, dir } = data ?? {};
  if (typeof url !== "string" || typeof db !== "string") return "url or db is not a string";
  if (typeof port !== "number" || `${port}.json` !== path.basename(file)) return "port does not match the file name";
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid < 2) return `pid ${JSON.stringify(pid)} is not a process id`;
  if (!isDriveTempDir(dir)) return `dir ${JSON.stringify(dir)} is not a taskboard-drive-* dir in ${os.tmpdir()}`;
  return { url, port, pid, db, dir };
}

/** Creates the state dir private to this user, or tightens one an earlier version left group-writable. */
function secureStateDir(options: { create: boolean; dryRun?: boolean }) {
  const stat = lstatSync(STATE_DIR, { throwIfNoEntry: false });
  if (!stat) {
    if (options.create) mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
    return;
  }
  if (!stat.isDirectory() || stat.uid !== process.getuid?.())
    throw new DriveError(`${STATE_DIR} is not a directory owned by you: remove it and retry.`);
  if ((stat.mode & 0o077) !== 0 && !options.dryRun) chmodSync(STATE_DIR, 0o700);
}

/** The running instances. Stale ones (pid dead or port not listening) and invalid state files are
 * reported and, unless dryRun, their files removed; an invalid file's dir is never touched. */
async function runningInstances(options: { dryRun?: boolean } = {}): Promise<Instance[]> {
  secureStateDir({ create: false, dryRun: options.dryRun });
  if (!existsSync(STATE_DIR)) return [];
  const running: Instance[] = [];
  for (const name of readdirSync(STATE_DIR).filter((file) => file.endsWith(".json"))) {
    const file = path.join(STATE_DIR, name);
    const instance = parseStateFile(file);
    if (typeof instance === "string") {
      if (!options.dryRun) rmSync(file, { force: true });
      console.error(`Ignored invalid state file ${file}: ${instance}${options.dryRun ? "" : "; removed the state file"}`);
    } else if (isAlive(instance.pid) && (await isListening(instance.port))) {
      running.push(instance);
    } else if (options.dryRun) {
      console.error(`Would prune stale instance on port ${instance.port} (pid ${instance.pid}): remove ${instance.dir}`);
    } else {
      removeInstanceFiles(instance);
      console.error(`Pruned stale instance on port ${instance.port} (pid ${instance.pid}); removed ${instance.dir}`);
    }
  }
  return running.sort((a, b) => a.port - b.port);
}

function portList(instances: Instance[]) {
  return instances.map((instance) => instance.port).join(", ");
}

/** The base URL from --url or --port, else the single running instance's. */
async function targetUrl(url: string | undefined, port: number | undefined): Promise<string> {
  if (url) return url.replace(/\/$/, "");
  if (port !== undefined) return `http://localhost:${port}`;
  const running = await runningInstances();
  if (running.length === 0) throw new DriveError("No running instance: run `npm run drive -- start`, or pass --url U.");
  if (running.length > 1)
    throw new DriveError(`Several instances are running (ports ${portList(running)}): pass --port N or --url U.`);
  return running[0].url;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

// ---------- start ----------

function build() {
  const result = spawnSync(NEXT_BIN, ["build"], { stdio: ["ignore", 2, 2] });
  if (result.status !== 0) throw new DriveError(`next build failed (exit ${result.status ?? result.signal})`);
}

async function waitForLogin(url: string, child: ReturnType<typeof spawn>): Promise<boolean> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false;
    try {
      const signal = AbortSignal.timeout(Math.max(1, deadline - Date.now()));
      if ((await fetch(`${url}/login`, { signal })).status === 200) return true;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function start(options: { port?: number; build?: boolean }): Promise<Instance> {
  if (options.port !== undefined) {
    if ((await runningInstances()).some((instance) => instance.port === options.port))
      throw new DriveError(
        `Port ${options.port} is a running drive instance: run \`npm run drive -- stop --port ${options.port}\` or pass another --port.`,
      );
    if (await isListening(options.port))
      throw new DriveError(`Port ${options.port} is in use by another process: pass another --port.`);
  }
  secureStateDir({ create: true });
  if (options.build || !existsSync(path.join(".next", "BUILD_ID"))) build();

  const port = options.port ?? (await freePort());
  const dir = await mkdtemp(path.join(os.tmpdir(), "taskboard-drive-"));
  const db = path.join(dir, "app.db");
  const log = path.join(dir, "server.log");
  const out = openSync(log, "a");
  const child = spawn(NEXT_BIN, ["start", "-p", String(port), "-H", "127.0.0.1"], {
    detached: true,
    stdio: ["ignore", out, out],
    env: { ...process.env, DATABASE_PATH: db, INSECURE_COOKIES: "1" },
  });
  child.unref();
  if (child.pid === undefined) {
    rmSync(dir, { recursive: true, force: true });
    throw new DriveError("Could not spawn next start");
  }
  const instance: Instance = { url: `http://localhost:${port}`, port, pid: child.pid, db, dir };

  // Past this point a failure must not leave a server or temp dir that no state file points to.
  try {
    if (!(await waitForLogin(`http://127.0.0.1:${port}`, child))) {
      const why =
        child.exitCode === null
          ? `/login did not return 200 within ${READY_TIMEOUT_MS / 1000}s`
          : `next start exited with ${child.exitCode}`;
      const tail = readFileSync(log, "utf8").split("\n").slice(-21).join("\n");
      throw new DriveError(`${why}. Last lines of server.log:\n${tail}`);
    }
    writeFileSync(stateFile(port), JSON.stringify(instance));
  } catch (error) {
    killGroup(instance.pid, "SIGKILL");
    removeInstanceFiles(instance);
    throw error;
  }
  return instance;
}

// ---------- stop ----------

function killGroup(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(-pid, signal);
  } catch {
    // group already gone
  }
}

async function waitUntilClosed(port: number, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!(await isListening(port))) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return !(await isListening(port));
}

async function stopInstance(instance: Instance) {
  killGroup(instance.pid, "SIGTERM");
  if (!(await waitUntilClosed(instance.port, STOP_TIMEOUT_MS))) {
    killGroup(instance.pid, "SIGKILL");
    if (!(await waitUntilClosed(instance.port, 2_000)))
      throw new DriveError(`Port ${instance.port} still listening after SIGKILL to group ${instance.pid}`);
  }
  removeInstanceFiles(instance);
}

/** The instances `stop` should act on: --all, the one on --port, or the single running one. */
async function stopTargets(options: { port?: number; all?: boolean; dryRun: boolean }): Promise<Instance[]> {
  const running = await runningInstances({ dryRun: options.dryRun });
  if (options.all) return running;
  if (options.port !== undefined) return running.filter((instance) => instance.port === options.port);
  if (running.length > 1)
    throw new DriveError(`Several instances are running (ports ${portList(running)}): pass --port N or --all.`);
  return running;
}

// ---------- screens ----------

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];
const SCREEN_NAMES = ["login", "signup", "projects", "board", "task"];

/** Seeds, then saves full-page screenshots of the main screens at desktop and phone widths. */
async function screens(baseURL: string, dir: string): Promise<{ dir: string; files: string[]; errors: string[] }> {
  const files: string[] = [];
  const errors: string[] = [];

  function recordErrors(page: Page) {
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      if (new URL(message.location().url || baseURL).pathname === "/favicon.ico") return;
      errors.push(`${page.url()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  }

  async function shoot(page: Page, urlPath: string, name: string, width: number) {
    await page.goto(urlPath);
    const file = path.join(dir, `${name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    files.push(file);
  }

  const browser = await chromium.launch();
  try {
    const seeded = await seed(browser, baseURL);
    mkdirSync(dir, { recursive: true });
    for (const viewport of VIEWPORTS) {
      const guest = await (await browser.newContext({ baseURL, viewport })).newPage();
      recordErrors(guest);
      await shoot(guest, "/login", "login", viewport.width);
      await shoot(guest, "/signup", "signup", viewport.width);
      await guest.context().close();

      const page = await signedInPage(browser, baseURL, DEMO_EMAIL);
      await page.setViewportSize(viewport);
      recordErrors(page);
      await shoot(page, "/projects", "projects", viewport.width);
      await shoot(page, seeded.boardUrl, "board", viewport.width);
      await shoot(page, seeded.taskUrl, "task", viewport.width);
      await page.context().close();
    }
  } finally {
    await browser.close();
  }
  return { dir, files, errors };
}

async function seedApp(baseURL: string): Promise<Seeded> {
  const browser = await chromium.launch();
  try {
    return await seed(browser, baseURL);
  } finally {
    await browser.close();
  }
}

/** Every expected screenshot exists and is non-empty; returns the problems. */
function missingScreens(dir: string): string[] {
  const problems: string[] = [];
  for (const width of VIEWPORTS.map((viewport) => viewport.width))
    for (const name of SCREEN_NAMES) {
      const file = path.join(dir, `${name}-${width}.png`);
      if (!existsSync(file)) problems.push(`${file} missing`);
      else if (statSync(file).size === 0) problems.push(`${file} empty`);
    }
  return problems;
}

// ---------- check ----------

type Step = { name: string; ok: boolean; detail: string };

async function check(options: { build?: boolean }): Promise<{ ok: boolean; steps: Step[] }> {
  const steps: Step[] = [];
  const run = async (name: string, action: () => Promise<string>) => {
    if (steps.some((step) => !step.ok)) return steps.push({ name, ok: false, detail: "skipped (an earlier step failed)" });
    try {
      steps.push({ name, ok: true, detail: await action() });
    } catch (error) {
      steps.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  };

  let instance: Instance | undefined;
  const shots = await mkdtemp(path.join(os.tmpdir(), "taskboard-drive-check-"));
  try {
    await run("start", async () => {
      instance = await start({ build: options.build });
      return `${instance.url} (pid ${instance.pid})`;
    });
    await run("seed", async () => `board ${(await seedApp(instance!.url)).boardUrl}`);
    await run("screens", async () => {
      const result = await screens(instance!.url, shots);
      if (result.errors.length > 0) throw new Error(`console/page errors:\n${result.errors.join("\n")}`);
      return `${result.files.length} files`;
    });
    await run("files", async () => {
      const problems = missingScreens(shots);
      if (problems.length > 0) throw new Error(problems.join("; "));
      return `${VIEWPORTS.length * SCREEN_NAMES.length} non-empty PNGs`;
    });
  } finally {
    rmSync(shots, { recursive: true, force: true });
    const stopped = instance;
    try {
      if (stopped) await stopInstance(stopped);
      steps.push({ name: "stop", ok: true, detail: stopped ? `port ${stopped.port} closed, temp dir removed` : "nothing started" });
    } catch (error) {
      steps.push({ name: "stop", ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  }
  return { ok: steps.every((step) => step.ok), steps };
}

// ---------- CLI ----------

type OptionSpec = { type: "string" | "boolean"; description: string };

const COMMANDS: Record<string, { usage: string; summary: string; options: Record<string, OptionSpec> }> = {
  start: {
    usage: "start [--port N] [--build] [--json]",
    summary: "Build if needed, start next on a free port with a temp database, wait for /login.",
    options: {
      port: { type: "string", description: "port to listen on (default: a free one)" },
      build: { type: "boolean", description: "run next build first even if .next/BUILD_ID exists" },
      json: { type: "boolean", description: 'print one JSON line {"url","db","pid","port"}' },
    },
  },
  seed: {
    usage: "seed [--url U | --port N] [--json]",
    summary: "Fill the app with demo data through its UI (idempotent); print sign-in and URLs.",
    options: {
      url: { type: "string", description: "base URL of the app (default: the single running instance)" },
      port: { type: "string", description: "use http://localhost:N" },
      json: { type: "boolean", description: 'print {"email","password","boardUrl","taskUrl"}' },
    },
  },
  screens: {
    usage: "screens <dir> [--url U | --port N] [--json]",
    summary: "Seed, then save 10 full-page PNGs; exit 1 listing console/page errors.",
    options: {
      url: { type: "string", description: "base URL of the app (default: the single running instance)" },
      port: { type: "string", description: "use http://localhost:N" },
      json: { type: "boolean", description: 'print {"dir","files":[...],"errors":[...]}' },
    },
  },
  check: {
    usage: "check [--build] [--json]",
    summary: "start, seed, screens, files, stop; always cleans up; exit 0 only if every step passed.",
    options: {
      build: { type: "boolean", description: "pass --build to start" },
      json: { type: "boolean", description: 'print {"ok","steps":[{"name","ok","detail"}]}' },
    },
  },
  stop: {
    usage: "stop [--port N | --all] [--dry-run] [--json]",
    summary: "Stop an instance's process group and delete its temp dir and state file.",
    options: {
      port: { type: "string", description: "the instance on port N (default: the single running one)" },
      all: { type: "boolean", description: "every running instance" },
      "dry-run": { type: "boolean", description: "print what would be killed and deleted; change nothing" },
      json: { type: "boolean", description: 'print {"stopped":[{"port","pid","dir"}],"dryRun"}' },
    },
  },
};

function mainUsage(): string {
  const lines = Object.values(COMMANDS).map((command) => `  ${command.usage.padEnd(46)} ${command.summary}`);
  return `Usage: npm run drive -- <command> [options]\n\nCommands:\n${lines.join("\n")}\n\nnpm run drive -- <command> --help shows a command's options.`;
}

function commandUsage(name: string): string {
  const command = COMMANDS[name];
  const options = Object.entries(command.options).map(
    ([option, spec]) => `  --${option}${spec.type === "string" ? " <value>" : ""}`.padEnd(22) + spec.description,
  );
  return `Usage: npm run drive -- ${command.usage}\n\n${command.summary}\n\nOptions:\n${options.join("\n")}\n  --help              show this help`;
}

function portOption(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new DriveError(`--port must be a port number, got "${value}"\n\n${commandUsage(name)}`, 2);
  return port;
}

function print(json: boolean | undefined, data: unknown, lines: string[]) {
  console.log(json ? JSON.stringify(data) : lines.join("\n"));
}

async function main(argv: string[]): Promise<number> {
  const [name, ...rest] = argv;
  if (name === "--help" || name === "-h") {
    console.log(mainUsage());
    return 0;
  }
  if (!name || !Object.hasOwn(COMMANDS, name)) {
    console.error(`${name ? `Unknown command "${name}"` : "No command given"}.\n\n${mainUsage()}`);
    return 2;
  }
  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      options: { ...COMMANDS[name].options, help: { type: "boolean" } },
      allowPositionals: name === "screens",
      strict: true,
    });
  } catch (error) {
    throw new DriveError(`${(error as Error).message}\n\n${commandUsage(name)}`, 2);
  }
  const values = parsed.values as Record<string, string | boolean | undefined>;
  if (values.help) {
    console.log(commandUsage(name));
    return 0;
  }
  const json = values.json === true;
  const url = values.url as string | undefined;
  const port = portOption(values.port as string | undefined, name);

  switch (name) {
    case "start": {
      const instance = await start({ port, build: values.build === true });
      const { url: u, db, pid } = instance;
      print(json, { url: u, db, pid, port: instance.port }, [
        `URL: ${u}`,
        `Database: ${db}`,
        `PID: ${pid}`,
        `Port: ${instance.port}`,
      ]);
      return 0;
    }
    case "seed": {
      const seeded = await seedApp(await targetUrl(url, port));
      print(json, seeded, [
        `Sign in: ${seeded.email} / ${seeded.password}`,
        `Board: ${seeded.boardUrl}`,
        `Task: ${seeded.taskUrl}`,
      ]);
      return 0;
    }
    case "screens": {
      const dir = parsed.positionals[0];
      if (!dir || parsed.positionals.length > 1) throw new DriveError(`Give one <dir>.\n\n${commandUsage(name)}`, 2);
      const result = await screens(await targetUrl(url, port), path.resolve(dir));
      print(json, result, [...result.files, ...(result.errors.length ? ["Console errors:", ...result.errors] : [])]);
      return result.errors.length > 0 ? 1 : 0;
    }
    case "check": {
      const result = await check({ build: values.build === true });
      print(
        json,
        result,
        result.steps.map((step) => `${step.ok ? "ok  " : "FAIL"} ${step.name}: ${step.detail}`),
      );
      return result.ok ? 0 : 1;
    }
    case "stop": {
      const dryRun = values["dry-run"] === true;
      const targets = await stopTargets({ port, all: values.all === true, dryRun });
      if (!dryRun) for (const instance of targets) await stopInstance(instance);
      const stopped = targets.map(({ port, pid, dir }) => ({ port, pid, dir }));
      const verb = dryRun ? "Would stop" : "Stopped";
      print(
        json,
        { stopped, dryRun },
        targets.length === 0
          ? [port === undefined ? "nothing running" : `nothing running on port ${port}`]
          : targets.map(
              (i) => `${verb} port ${i.port}: kill process group ${i.pid}, delete ${i.dir} and ${stateFile(i.port)}`,
            ),
      );
      return 0;
    }
  }
  return 2;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof DriveError)) throw error;
  console.error(error.message);
  process.exitCode = error.code;
}
