/* eslint-disable no-undef */

import * as Fs from "node:fs";

import madge from "madge";

madge(Fs.globSync("packages/*/src/**/*.ts"), {
    detectiveOptions: {
        ts: {
            skipTypeImports: true,
        },
    },
}).then((res) => {
    const circular = res.circular();
    if (circular.length) {
        console.error("Circular dependencies found");
        console.error(circular);
        process.exit(1);
    }
});
