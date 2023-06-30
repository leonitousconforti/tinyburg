import architect from "./index.js";

// You can either use something like the dockerConnectionOptions below
// or just use the environment variable DOCKER_HOST and you don't have
// to specify anything in the docker connection options
// process.env["DOCKER_HOST"] = "ssh://root@architect02.tinyburg.app:22";

const { emulatorContainer } = await architect({
    reuseExistingContainers: true,
    dockerConnectionOptions: {
        protocol: "ssh",
        host: "architect02.tinyburg.app",
        port: 22,
        username: "root",
        sshOptions: {
            agent: process.env["SSH_AUTH_SOCK"],
        },
    },
});

console.log(emulatorContainer.id);
