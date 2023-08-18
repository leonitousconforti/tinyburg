// DEBUG=tinyburg:* node --loader ts-node/esm ./src/interactive.ts

import architect from "./index.js";

const {
    adbAddress,
    adbConsoleAddress,
    grpcAddress,
    fridaAddress,
    envoyGrpcWebAddress,
    envoyAdminAddress,
    emulatorServices,
} = await architect({
    reuseExistingContainers: false,
});

console.log(`adbAddress: ${adbAddress}`);
console.log(`adbConsoleAddress: ${adbConsoleAddress}`);
console.log(`grpcAddress: ${grpcAddress}`);
console.log(`fridaAddress: ${fridaAddress}`);
console.log(`envoyGrpcWebAddress: ${envoyGrpcWebAddress}`);
console.log(`envoyAdminAddress: ${envoyAdminAddress}`);

process.on("SIGINT", async () => {
    console.log("Stopping all containers...");
    await emulatorServices.stopAll();
    console.log("Removing all containers...");
    await emulatorServices.removeAll();
    return process.exit(0);
});
