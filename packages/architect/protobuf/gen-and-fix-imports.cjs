const path = require("node:path");
const fs = require("node:fs/promises");
const { execSync } = require("node:child_process");

const generateProtobufJavascriptSources = () =>
    execSync(
        "protoc -I ./protobuf --ts_out ./protobuf --ts_opt optimize_code_size --ts_opt output_javascript ./protobuf/emulator_controller.proto ./protobuf/rtc_service.proto"
    );

const fixProtobufImportsForEsm = async () => {
    const allFiles = await fs.readdir(__dirname);
    const jsFiles = allFiles.filter((file) => file.endsWith(".js") || file.endsWith(".d.ts"));

    for (const jsFile of jsFiles) {
        const jsPath = path.join(__dirname, jsFile);
        let jsSource = await fs.readFile(jsPath, "utf8");
        jsSource = jsSource
            .split("\n")
            .map((s) => s.replace(/^(import .+? from ["']\..+?)(["'];)$/, "$1.js$2"))
            .join("\n");
        await fs.writeFile(jsPath, jsSource, "utf8");
    }
};

module.exports.runAsync = async () => {
    generateProtobufJavascriptSources();
    await fixProtobufImportsForEsm();
};
