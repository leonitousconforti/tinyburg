async function main() {
    const { loadApk } = await import("./index.js");
    const { defaultVersion, defaultSupplier, defaultArchitecture } = await import("./types.js");
    await Promise.all([
        loadApk("TinyTower", defaultVersion, defaultSupplier, defaultArchitecture),
        loadApk("LegoTower", defaultVersion, defaultSupplier, defaultArchitecture),
        loadApk("TinyTowerVegas", defaultVersion, defaultSupplier, defaultArchitecture),
    ]);
}

main().catch((error) => console.error(error));
