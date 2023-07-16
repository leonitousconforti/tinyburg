const sharp = require("sharp");
const path = require("node:path");
const fs = require("node:fs/promises");
const exec = require("node:child_process");

module.exports.runAsync = async () => {
    const { loadApk } = await import("@tinyburg/apks");
    const apkPath = await loadApk("apkpure", "4.23.0");
    const pythonExtractScript = path.join(__dirname, "extract.py");
    const pipRequirements = path.join(__dirname, "requirements.txt");
    exec.execSync(`pip3 install -r ${pipRequirements}`);
    exec.execSync(`python3 ${pythonExtractScript} --apk "${apkPath}" --only_required`);

    await fs.copyFile(path.join(__dirname, "extracted/game.png"), path.join(__dirname, "../templates/game.png"));
    await fs.copyFile(path.join(__dirname, "extracted/game.txt"), path.join(__dirname, "../templates/game.json"));

    const spritesJson = require("../templates/game.json");
    const spritesPng = sharp(path.join(__dirname, "../templates/game.png"));
    const silkscreenRegion = {
        top: spritesJson.frames["silkscreen.png"].frame.y,
        left: spritesJson.frames["silkscreen.png"].frame.x,
        width: spritesJson.frames["silkscreen.png"].frame.w,
        height: spritesJson.frames["silkscreen.png"].frame.h,
    };
    const silkscreenPng = spritesPng.extract(silkscreenRegion).png();
    const silkscreenTxt = await fs.readFile(path.join(__dirname, "extracted/silkscreen.txt"));
    const silkscreenJson = silkscreenTxt
        .toString()
        .replaceAll("char id", "char_id")
        .trim()
        .split("\n")
        .slice(4)
        .map((line) => line.split(/\s+/))
        .map((fields) => fields.map((field) => field.split("=")))
        .map((fields) => fields.map(([key, value]) => [key, isNaN(Number(value)) ? value : Number(value)]))
        .map((fields) => Object.fromEntries(fields));

    await silkscreenPng.toFile(path.join(__dirname, "../templates/silkscreen.png"));
    await fs.writeFile(path.join(__dirname, "../templates/silkscreen.json"), JSON.stringify(silkscreenJson));
    exec.execSync("NODE_OPTIONS=--no-warnings rushx templates:gen");
};
