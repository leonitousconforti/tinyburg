/* eslint-disable @rushstack/no-new-null */
/* eslint-disable @typescript-eslint/naming-convention */

import url from "node:url";
import path from "node:path";

import Debug from "debug";
import express from "express";

import loadapk from "@tinyburg/apks";
import architect from "@tinyburg/architect";

const apk: string = await loadapk("TinyTower", "latest version");
const logger: Debug.Debugger = Debug.debug("tinyburg:integrations:architect+spectator");
const spectator: string = url.fileURLToPath(new URL("node_modules/@tinyburg/spectator/build", import.meta.url));

const { envoyGrpcWebAddress, installApk } = await architect();
await installApk(apk);

express()
    .use(express.static(spectator))
    .get("/", (_request, response) => response.sendFile(path.join(spectator, "index.html")))
    .listen(9000);

logger("Available at localhost:9000/?address=%s", envoyGrpcWebAddress);
