const fs = require("node:fs");
const path = require("node:path");
const prettier = require("prettier");

/** @param {string} path */
const checkFileExists = async (path) =>
    await fs.promises
        .access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

module.exports.runAsync = async () => {
    const { loadApk } = await import("./index.js");
    const { LatestVersion } = await import("./latest-version.js");
    const { getApkpureLatestDetails, downloadLatestApkpureApk } = await import("./apkpure.puppeteer.js");
    const { getApkmirrorLatestDetails, downloadLatestApkmirrorApk } = await import("./apkmirror.puppeteer.js");

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
        // @ts-ignore
        loadApk("apkpure", apkpureLatestDetails.latestVersion),
        // @ts-ignore
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

    await fs.promises.writeFile(
        path.join(__dirname, "../src/latest-version.ts"),
        prettier.format(
            disableEslintError + typescriptExport1 + "\n" + disableEslintError + typescriptExport2,
            prettierOptions
        )
    );
};
