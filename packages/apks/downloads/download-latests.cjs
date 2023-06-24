module.exports.runAsync = async () => {
    const { downloadLatestApkpureApk } = await import("../dist/apkpure.puppeteer.js");
    const { downloadLatestApkmirrorApk } = await import("../dist/apkmirror.puppeteer.js");
    return Promise.all([downloadLatestApkpureApk(), downloadLatestApkmirrorApk()]);
};
