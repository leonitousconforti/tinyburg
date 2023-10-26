// rushx build && node dist/test/benchmark.js

/**
 * Benchmark tests for architect don't really make sense, since it will largely
 * depend on this hardware and internet connection of your docker host. This
 * benchmark file is really just to assist with relative benchmarking, where you
 * make a small change in architect and then re-run this benchmark and compare
 * the time before your change to the time after your change.
 */

import "./setup-tests.js";
import { architect } from "../src/index.js";

const { emulatorContainer } = await architect();
await emulatorContainer.stop();
await emulatorContainer.remove();
