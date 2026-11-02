// Rebuilds a foldkit app whenever its sources change, for the dev stack.
//
// `vite build --watch` cannot build a server-rendered foldkit app: the plugin
// finalizes the build as soon as the watched server environment starts, before
// it has emitted its entry, and fails. So this reruns a whole `vite build`
// instead, and the server loads the rewritten `dist/server/fetch.js` on its
// next page request (`ServerRendering` in shared-ui).
//
// Every directory gets its own watch rather than one recursive watch per root:
// on Linux a recursive watch stops reporting a file once it has been replaced
// (git checkout, `sed -i`, an editor's atomic save), while a directory watch
// keeps reporting its entries whatever happens to them.
//
// Run from the app's directory (`pnpm --filter <app> exec node .../vite-watch.mjs`)
// so `vite` resolves from the app's own `node_modules/.bin`.

import { spawn } from "node:child_process";
import * as Fs from "node:fs";
import * as Path from "node:path";

const app = process.cwd();
const repo = Path.resolve(import.meta.dirname, "..");

// The whole app rather than its `client/`: the browser and server bundles also
// import its `shared/` and `domain/` modules.
const roots = [
    app,
    Path.join(repo, "apps/shared-ui/src"),
    ...Fs.globSync("packages/*/src", { cwd: repo }).map((src) => Path.join(repo, src)),
];

// Build output, dependencies, and what tsc writes during a check.
const isIgnored = (name) =>
    name === "node_modules" || name === "dist" || name.startsWith(".") || name.endsWith(".tsbuildinfo");

let running;
let pending = false;

const build = () => {
    if (running !== undefined) {
        pending = true;
        return;
    }
    running = spawn("vite", ["build"], { stdio: "inherit" });
    running.on("exit", () => {
        running = undefined;
        if (pending) {
            pending = false;
            build();
        }
    });
};

let timer;
const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(build, 100);
};

const watchers = new Map();

const watchTree = (directory) => {
    let entries;
    try {
        entries = Fs.readdirSync(directory, { withFileTypes: true });
    } catch {
        return;
    }
    if (!watchers.has(directory)) {
        const watcher = Fs.watch(directory, (event, name) => {
            if (name !== null && isIgnored(name)) return;
            schedule();
            // A removed directory's watch is dropped so a directory created
            // again in its place gets a new one; a new directory needs one too.
            if (event === "rename") {
                for (const [watched, stale] of watchers) {
                    if (watched.startsWith(directory + Path.sep) && !Fs.existsSync(watched)) {
                        stale.close();
                        watchers.delete(watched);
                    }
                }
                watchTree(directory);
            }
        });
        watcher.on("error", () => {
            watcher.close();
            watchers.delete(directory);
        });
        watchers.set(directory, watcher);
    }
    for (const entry of entries) {
        if (entry.isDirectory() && !isIgnored(entry.name)) watchTree(Path.join(directory, entry.name));
    }
};

for (const root of roots) watchTree(root);

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        running?.kill(signal);
        process.exit(0);
    });
}

build();
