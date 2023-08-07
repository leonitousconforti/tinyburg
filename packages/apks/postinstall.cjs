async function main() {
    const { LatestDetails } = await import("./dist/latest-version.js");
    const { downloadLatestApkpureApk } = await import("./dist/apkpure.puppeteer.js");
    const { downloadLatestApkmirrorApk } = await import("./dist/apkmirror.puppeteer.js");
    await Promise.all([downloadLatestApkpureApk(LatestDetails[0]), downloadLatestApkmirrorApk(LatestDetails[1])]);
}

main().catch(() => {});
