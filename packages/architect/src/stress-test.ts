#!/usr/bin/env node

import architect from "./index.js";

import loadApk from "@tinyburg/apks";
const apk: string = await loadApk("apkpure", "4.24.0");

// How many times to run the stress tests
const TOTAL_RUN_ITERATIONS: number = 30;

for (let run_index: number = 1; run_index <= TOTAL_RUN_ITERATIONS; run_index++) {
    const { emulatorServices } = await architect({ reuseExistingContainers: false });
    await emulatorServices.installApk(apk);
    await emulatorServices.stopAll();
    await emulatorServices.removeAll();
    console.log(`----------run_index=${run_index}----------`);
}
