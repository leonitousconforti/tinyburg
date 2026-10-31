import * as Fs from "node:fs";

const dirs = [".", ...Fs.globSync(["apps/*", "packages/*"]).filter((_) => Fs.statSync(_).isDirectory())];
dirs.forEach((pkg) => {
    const files = [".tsbuildinfo", "build", "dist", "temp", "coverage"];

    files.forEach((file) => {
        Fs.rmSync(`${pkg}/${file}`, { recursive: true, force: true }, () => {});
    });
});
