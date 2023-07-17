const path = require("node:path");
const prettier = require("prettier");
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
    const { LatestVersion } = await import("../dist/latest-version.js");
    const { getApkpureLatestDetails, downloadLatestApkpureApk } = await import("../dist/apkpure.puppeteer.js");
    const { getApkmirrorLatestDetails, downloadLatestApkmirrorApk } = await import("../dist/apkmirror.puppeteer.js");

    const prettierOptions = {
        parser: "typescript",
        ...(await prettier.resolveConfig(__dirname, { editorconfig: true })),
    };

    const [apkpureLatestDetails, apkmirrorLatestDetails] = await Promise.all([
        getApkpureLatestDetails(),
        getApkmirrorLatestDetails(),
    ]);
    if (apkpureLatestDetails.latestVersion !== apkmirrorLatestDetails.latestVersion) {
        throw new Error("I got two different latest versions!");
    }

    const apks = await Promise.all([
        loadApk("apkpure", apkpureLatestDetails.latestVersion),
        loadApk("apkmirror", apkmirrorLatestDetails.latestVersion),
    ]);
    const exists = await Promise.all(apks.map((apk) => checkFileExists(apk)));
    if (exists.every(Boolean) && apkpureLatestDetails.latestVersion === LatestVersion) {
        return;
    }

    await Promise.all([
        downloadLatestApkmirrorApk(apkmirrorLatestDetails),
        downloadLatestApkpureApk(apkpureLatestDetails),
    ]);

    const disableEslintError = "// eslint-disable-next-line @rushstack/typedef-var\n";
    const typescriptExport1 = `export const LatestVersion = "${apkpureLatestDetails.latestVersion}" as const;\n`;
    const typescriptExport2 = `export const LatestDetails = [${JSON.stringify(apkpureLatestDetails)}, ${JSON.stringify(
        apkmirrorLatestDetails
    )}] as const;\n`;
    await fs.writeFile(
        path.join(__dirname, "../src/latest-version.ts"),
        prettier.format(
            disableEslintError + typescriptExport1 + "\n" + disableEslintError + typescriptExport2,
            prettierOptions
        )
    );
};
