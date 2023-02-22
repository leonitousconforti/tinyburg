import type Dockerode from "dockerode";

import { stdout } from "node:process";
import { loadApk } from "@tinyburg/apks";
import { startContainer } from "./index.js";

const apks: string[] = [await loadApk("4.14.0", "apkpure")];
const container: Dockerode.Container = await startContainer(apks);

console.log("here");
const stream: NodeJS.ReadableStream = await container.logs({ follow: true, stdout: true, stderr: true });
stream.pipe(stdout, { end: true });

await new Promise((resolve) => setTimeout(resolve, 180 * 1000));
await container.stop();
await container.remove();
