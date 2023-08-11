const fs = require("node:fs");
const path = require("node:path");
const prettier = require("prettier");

/**
 * Generates a Typescript version type for the list of apks in a folder.
 *
 * @param {"apkpure" | "apkmirror" | "patched"} source
 * @param {(apk: string) => string | undefined} formatFunction
 */
const generateVersion = async (source, formatFunction) => {
    const allFiles = await fs.promises.readdir(path.join(__dirname, "..", "downloads", source));
    const apks = allFiles.filter((file) => file.endsWith(".apk"));
    const formattedApkNames = apks.map((apk) => formatFunction(apk));

    const sortedApkNames = formattedApkNames.sort();
    const safeTypescriptNames = sortedApkNames.map((apk) => `"${apk}"`);
    const joinedString = safeTypescriptNames.join(", ");

    const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);
    const disableEslintError = "// eslint-disable-next-line @rushstack/typedef-var\n";
    const typescriptVersions = `export const ${capitalizedSource}Versions = [${joinedString}] as const;\n\n`;
    const typescriptType = `export type ${capitalizedSource}Version = (typeof ${capitalizedSource}Versions)[number];\n`;
    const typescriptSource = disableEslintError + typescriptVersions + typescriptType;

    const prettierOptions = {
        parser: "typescript",
        ...(await prettier.resolveConfig(__dirname, { editorconfig: true })),
    };
    const outFile = path.join(__dirname, "..", "src", `${source}.type.ts`);
    await fs.promises.writeFile(outFile, prettier.format(typescriptSource, prettierOptions));
};

module.exports.runAsync = async () => {
    await generateVersion("patched", (apk) => apk.replace(".apk", ""));
    await generateVersion("apkpure", (apk) => apk.match(/\d+.\d+.\d+/gm)?.[0]);
    await generateVersion("apkmirror", (apk) => apk.match(/\d+.\d+.\d+/gm)?.[0]);
};
