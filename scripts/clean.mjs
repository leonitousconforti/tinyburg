import * as Fs from "node:fs";

const dirs = [".", ...Fs.globSync(["apps/*", "packages/*"]).filter((_) => Fs.statSync(_).isDirectory())];
dirs.forEach((pkg) => {
    // The apps are not incremental, so they cannot point `tsBuildInfoFile` into
    // `.tsbuildinfo`, but `tsc -b` still writes one next to their tsconfig.
    const files = [".tsbuildinfo", "tsconfig.tsbuildinfo", "build", "dist", "temp", "coverage"];

    files.forEach((file) => {
        Fs.rmSync(`${pkg}/${file}`, { recursive: true, force: true }, () => {});
    });
});
