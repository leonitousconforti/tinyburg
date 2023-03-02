/**
 * Install frida tools with: pip3 install frida-tools. Run this example/test
 * with: rushx test. Finally, connect to the frida gadget with: frida-ps --host
 * 172.17.0.1:27042.
 */

import type dockerode from "dockerode";

import { loadPatchedApk } from "@tinyburg/apks";
import { architect } from "./index.js";

let container2: dockerode.Container | undefined;

try {
    const apk: string = await loadPatchedApk("apkpure-4.14.0-with-frida-gadget");
    const { container, installApk } = await architect();
    container2 = container;
    await installApk(apk);
    console.log("waiting 10 minutes before stopping and removing the container");
    await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 10));
} catch (error) {
    console.log(error);
}

await container2?.stop();
await container2?.remove();
