(async function main() {
    const { loadApk, Games } = await import("./index.js");
    await Promise.allSettled(Object.values(Games).map((game) => loadApk(game)));
})();
