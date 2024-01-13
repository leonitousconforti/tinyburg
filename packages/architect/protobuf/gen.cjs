const fs = require("node:fs");
const path = require("node:path");

const rtcServiceProto =
    "https://android.googlesource.com/platform/external/qemu/+/emu-master-dev/android/android-webrtc/android-webrtc/rtc_service.proto?format=TEXT";
const emulatorControllerProto =
    "https://android.googlesource.com/platform/external/qemu/+/emu-master-dev/android/android-grpc/services/emulator-controller/proto/emulator_controller.proto?format=TEXT";

module.exports.runAsync = async () => {
    const { execa } = await import("execa");

    const response1 = await fetch(rtcServiceProto);
    const text1 = await response1.text();
    const buffer1 = Buffer.from(text1, "base64").toString("utf8");
    await fs.promises.writeFile(path.join(__dirname, "rtc_service.proto"), buffer1);

    const response2 = await fetch(emulatorControllerProto);
    const text2 = await response2.text();
    const buffer2 = Buffer.from(text2, "base64").toString("utf8");
    await fs.promises.writeFile(path.join(__dirname, "emulator_controller.proto"), buffer2);

    await execa("buf", ["generate"]);
};
