// This is a postinstall script that downloads the latest APKs for all games
(async function main() {
    const { loadApk, Games } = await import("./index.js");
    await Promise.allSettled(Object.values(Games).map((game) => loadApk(game)));
})();
