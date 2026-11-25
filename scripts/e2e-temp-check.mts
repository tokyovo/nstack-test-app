// Usage: npm run check:e2e-temp [-- <playwright test args>]
// Runs the e2e suite, then lists the temp SQLite files left by that run (AC31).
// playwright.config.ts names the file taskboard-e2e-<pid>-<time>.db after the Playwright
// process, which is the child started here, so parallel runs do not count.
// Exits 1 if any file of this run remains, else with the suite's exit code.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";

const cli = createRequire(import.meta.url).resolve("@playwright/test/cli");
const env = { ...process.env };
delete env.E2E_DATABASE_PATH; // a caller-set path is kept on purpose, so would not be checked

const child = spawn(process.execPath, [cli, "test", ...process.argv.slice(2)], { stdio: "inherit", env });
const code = await new Promise<number>((resolve) => child.on("exit", (status) => resolve(status ?? 1)));

const prefix = `taskboard-e2e-${child.pid}-`;
const left = readdirSync(os.tmpdir()).filter((name) => name.startsWith(prefix));
console.log(`${left.length} ${prefix}* file(s) left in ${os.tmpdir()}`);
for (const name of left) console.log(`  ${name}`);
process.exit(left.length > 0 ? 1 : code);
