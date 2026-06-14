import * as Fs from "node:fs";

import * as Glob from "glob";

const dirs = [".", ...Glob.sync("packages/*/")];
dirs.forEach((pkg) => {
    const files = [".tsbuildinfo", "build", "dist", "temp", "coverage"];

    files.forEach((file) => {
        Fs.rmSync(`${pkg}/${file}`, { recursive: true, force: true }, () => {});
    });
});
