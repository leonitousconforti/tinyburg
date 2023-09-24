module.exports.runAsync = async () => {
    const childProcess = require("node:child_process");
    const child = childProcess.spawnSync("buf", ["generate"], { stdio: "inherit" });
    if (child.error) throw child.error;
    if (child.status) throw new Error(`buf exited with status ${child.status}`);
};
