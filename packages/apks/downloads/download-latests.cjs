const path = require("node:path");
const fs = require("node:fs/promises");

module.exports.runAsync = async () => {
    const { LatestVersion } = await import("../dist/latest-version.js");
    const { getApkpureLatestDetails, downloadLatestApkpureApk } = await import("../dist/apkpure.puppeteer.js");
    const { getApkmirrorLatestDetails, downloadLatestApkmirrorApk } = await import("../dist/apkmirror.puppeteer.js");

    const [{ latestVersion: latestVersion1 }, { latestVersion: latestVersion2 }] = await Promise.all([
        getApkpureLatestDetails(),
        getApkmirrorLatestDetails(),
    ]);
    if (latestVersion1 !== latestVersion2) {
        throw new Error("I got two different latest versions!");
    }
    if (LatestVersion === latestVersion1) {
        return;
    }

    await Promise.all([downloadLatestApkmirrorApk(), downloadLatestApkpureApk()]);
    const disableEslintError = "// eslint-disable-next-line @rushstack/typedef-var\n";
    const typescriptExport = `export const LatestVersion = "${latestVersion1}" as const;\n`;
    await fs.writeFile(path.join(__dirname, "../src/latest-version.ts"), disableEslintError + typescriptExport);
};
