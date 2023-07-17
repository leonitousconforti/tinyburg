const path = require("node:path");
const fs = require("node:fs/promises");

const checkFileExists = async (path) => {
    try {
        await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
};

module.exports.runAsync = async () => {
    const { loadApk } = await import("../dist/index.js");
    const { getApkpureLatestDetails, downloadLatestApkpureApk } = await import("../dist/apkpure.puppeteer.js");
    const { getApkmirrorLatestDetails, downloadLatestApkmirrorApk } = await import("../dist/apkmirror.puppeteer.js");

    const [{ latestVersion: latestVersion1 }, { latestVersion: latestVersion2 }] = await Promise.all([
        getApkpureLatestDetails(),
        getApkmirrorLatestDetails(),
    ]);
    if (latestVersion1 !== latestVersion2) {
        throw new Error("I got two different latest versions!");
    }

    const apks = await Promise.all([loadApk("apkpure", latestVersion1), loadApk("apkmirror", latestVersion1)]);
    const exists = await Promise.all(apks.map((apk) => checkFileExists(apk)));
    if (exists.every(Boolean)) {
        return;
    }

    await Promise.all([downloadLatestApkmirrorApk(), downloadLatestApkpureApk()]);
    const disableEslintError = "// eslint-disable-next-line @rushstack/typedef-var\n";
    const typescriptExport = `export const LatestVersion = "${latestVersion1}" as const;\n`;
    await fs.writeFile(path.join(__dirname, "../src/latest-version.ts"), disableEslintError + typescriptExport);
};
