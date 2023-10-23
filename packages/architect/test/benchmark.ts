/**
 * Benchmark tests for architect don't really make sense, since it will largely
 * depend on this hardware and internet connection of your docker host. This
 * benchmark file is really just to assist with relative benchmarking, where you
 * make a small change in architect and then re-run this benchmark and compare
 * the time before your change to the time after your change.
 */

import { architect } from "../src/index.js";

const start: number = performance.now();
const { emulatorContainer } = await architect();
const end: number = performance.now();
const performanceDelta: string = ((end - start) / 1000).toFixed(2);

await emulatorContainer.stop();
await emulatorContainer.remove();

// eslint-disable-next-line no-console
console.log(`Architect took ${performanceDelta} seconds to start.`);
