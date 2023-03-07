const path = require("node:path");
const fs = require("node:fs/promises");
const prettier = require("prettier");

const generateVersion = async (source, formatFunction = (apk) => apk.match(/\d+.\d+.\d+/gm)[0]) => {
    const allFiles = await fs.readdir(path.join(__dirname, source));
    const apks = allFiles.filter((file) => file.endsWith(".apk"));
    const formattedApkNames = apks.map((apk) => formatFunction(apk));

    const sortedApkNames = formattedApkNames.sort();
    const safeTypescriptNames = sortedApkNames.map((apk) => `"${apk}"`);
    const joinedString = safeTypescriptNames.join(", ");

    const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);
    const disableEslintError = "// eslint-disable-next-line @rushstack/typedef-var\n";
    const typescriptVersions = `export const ${capitalizedSource}Versions = [${joinedString}] as const;\n\n`;
    const typescriptType = `export type ${capitalizedSource}Version = typeof ${capitalizedSource}Versions[number];\n`;
    const typescriptSource = disableEslintError + typescriptVersions + typescriptType;

    const prettierOptions = {
        parser: "typescript",
        ...(await prettier.resolveConfig(__dirname, { editorconfig: true })),
    };
    const outFile = path.join(__dirname, "..", "src", `${source}.type.ts`);
    await fs.writeFile(outFile, prettier.format(typescriptSource, prettierOptions));
};

module.exports.runAsync = async () => {
    await generateVersion("apkpure");
    await generateVersion("apkmirror");
    await generateVersion("patched", (apk) => apk.replace(".apk", ""));
};
