#!/usr/bin/env node

import architect from "./index.js";

import loadApk from "@tinyburg/apks";
const apk: string = await loadApk("apkpure", "4.24.0");

// How many times to run the stress tests and how many containers to launch each time
const TOTAL_RUN_ITERATIONS: number =
    Number.parseInt(process.env["ARCHITECT_STRESS_TOTAL_RUN_ITERATIONS"] as string, 10) || 7;
const PARALLEL_CONTAINERS_PER_RUN: number =
    Number.parseInt(process.env["ARCHITECT_STRESS_PARALLEL_CONTAINERS_PER_RUN"] as string, 10) || 3;

for (let run_index: number = 1; run_index <= TOTAL_RUN_ITERATIONS; run_index++) {
    const results: Array<Awaited<ReturnType<typeof architect>>> = await Promise.all(
        Array.from({ length: PARALLEL_CONTAINERS_PER_RUN }, () => architect({ reuseExistingContainers: false }))
    );
    await Promise.all(results.map(({ emulatorServices }) => emulatorServices.installApk(apk)));
    await Promise.all(results.map(({ emulatorServices }) => emulatorServices.stopAll()));
    await Promise.all(results.map(({ emulatorServices }) => emulatorServices.removeAll()));
    await Promise.all(results.map(({ emulatorDataVolume }) => emulatorDataVolume.remove()));
    console.log(`----------run_index=${run_index}----------`);
}
