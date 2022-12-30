import Jimp from "jimp";
import terminalKit from "terminal-kit";
import terminalImage from "terminal-image";
import { click } from "./grpc/send-touch.js";
import { getScreenshot } from "./grpc/get-screenshots.js";
import { createEmulatorControllerClient } from "./grpc/emulator-controller-client.js";

const terminal = terminalKit.terminal;
terminal.grabInput({ mouse: "button" });
const client = createEmulatorControllerClient("localhost:5556");

setInterval(async () => {
    const screenshot = await getScreenshot(client);
    new Jimp(
        { data: screenshot.pixels, width: screenshot.width, height: screenshot.height },
        async (error: unknown, image: any) => {
            if (error) {
                console.log(error);
            }

            const buff = await image.getBufferAsync(Jimp.MIME_PNG);
            console.log(await terminalImage.buffer(buff));
        }
    );
}, 100);

terminal.on("mouse", async function (name: any, data: any) {
    if (name === "MOUSE_LEFT_BUTTON_PRESSED") {
        const x = Math.round((data.x / 64) * 1080);
        const y = Math.floor((data.y / 46) * 1920);
        // console.log("x=" + x + ", " + "y=" + y);
        await click(client, { x, y, timeout: 500 });
    }
});

terminal.on("key", function (name: string) {
    console.log("'key' event:", name);
    if (name === "CTRL_C") {
        terminal.grabInput(false);
        setTimeout(function () {
            process.exit();
        }, 100);
    }
});
