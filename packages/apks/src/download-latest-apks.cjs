(async function main() {
    const { loadApk } = await import("./index.js");
    await Promise.allSettled([loadApk("TinyTower"), loadApk("LegoTower"), loadApk("TinyTowerVegas")]);
})();
