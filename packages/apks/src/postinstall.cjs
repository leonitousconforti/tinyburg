async function main() {
    const { LatestDetails } = await import("./latest-version.js");
    const { downloadLatestApkpureApk } = await import("./apkpure.puppeteer.js");
    const { downloadLatestApkmirrorApk } = await import("./apkmirror.puppeteer.js");
    await Promise.all([downloadLatestApkpureApk(LatestDetails[0]), downloadLatestApkmirrorApk(LatestDetails[1])]);
}

main().catch((error) => console.error(error));
