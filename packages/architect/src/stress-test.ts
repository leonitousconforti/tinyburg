#!/usr/bin/env node

import architect from "./index.js";

// How many times to run the stress tests and how many containers to launch each time
const TOTAL_RUN_ITERATIONS: number =
    Number.parseInt(process.env["ARCHITECT_STRESS_TOTAL_RUN_ITERATIONS"] as string, 10) || 25;
const PARALLEL_CONTAINERS_PER_RUN: number =
    Number.parseInt(process.env["ARCHITECT_STRESS_PARALLEL_CONTAINERS_PER_RUN"] as string, 10) || 3;

for (let run_index: number = 1; run_index <= TOTAL_RUN_ITERATIONS; run_index++) {
    const results: Array<Awaited<ReturnType<typeof architect>>> = await Promise.all(
        Array.from({ length: PARALLEL_CONTAINERS_PER_RUN }, () => architect({ reuseExistingContainers: false }))
    );
    await Promise.all(results.map((result) => result.emulatorContainer.stop()));
    await Promise.all(results.map((result) => result.emulatorContainer.remove()));
    console.log(`----------run_index=${run_index}----------`);
}
