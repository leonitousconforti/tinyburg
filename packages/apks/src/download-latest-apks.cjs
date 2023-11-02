(async function main() {
    const { loadApk } = await import("./index.js");
    await Promise.allSettled([
        loadApk("TinyTower"),
        loadApk("TinyTowerVegas"),
        loadApk("BitCity"),
        loadApk("PocketFrogs"),
        loadApk("PocketPlanes"),
        loadApk("PocketTrains"),
    ]);
})();
