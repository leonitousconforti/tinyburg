import type Dockerode from "dockerode";

import loadApk from "@tinyburg/apks";
import architect from "@tinyburg/architect";

// You can either use something like the dockerConnectionOptions below
// or just use the environment variable DOCKER_HOST and you don't have
// to specify anything in the docker connection options
// process.env["DOCKER_HOST"] = "ssh://root@architect02.tinyburg.app:22";

const apk: string = await loadApk("apkpure", "4.24.0");
const { emulatorServices } = await architect({
    reuseExistingContainers: false,
    dockerConnectionOptions: {
        protocol: "ssh",
        host: "skynet.internal.leoconforti.us",
        port: 22,
        username: "root",
        sshOptions: {
            // eslint-disable-next-line dot-notation
            agent: process.env["SSH_AUTH_SOCK"],
        },
    },
});
await emulatorServices.installApk(apk);

const emulatorContainer: Dockerode.Container = emulatorServices.getEmulatorContainer();
console.log(emulatorContainer.id);

await emulatorServices.stopAll();
await emulatorServices.removeAll();
