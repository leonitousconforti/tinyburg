import { loadFromApkpure } from "@tinyburg/apks";
import { Emulator, LocalEmulator } from "@tinyburg/architect";

// Create emulator instance
const emulator: Emulator = new LocalEmulator("testing");
await emulator.create();

// Launch emulator and install TinyTower version 4.12.0
const { installApk, launchGame, stopGame } = await emulator.up();
const apk = loadFromApkpure("4.12.0");
await installApk(apk);

// Launch TinyTower
const { processPid } = await launchGame();
console.log(`TinyTower running with pid: ${processPid}`);

// Stop TinyTower after 1 minute
setTimeout(async () => {
    await stopGame();
    await emulator.down();
    await emulator.destroy();
});
