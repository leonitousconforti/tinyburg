import fs from "node:fs/promises";
import prettier from "prettier";

// Load the game sprite sheet and silkscreen. This needs to be extracted from the game's
// resource files, there are lots of free open source tools out there that do this.
import sprites from "./game.json";
import silkscreen from "./silkscreen.json";

// Characters that need to be escaped before writing to the source code file
// eslint-disable-next-line quotes
const needToEscape = new Set(["\\", '"']);

// Get all the names
const spriteNames = Object.keys(sprites.frames).map((name) => `"${name.slice(0, name.lastIndexOf("."))}"`);
const characterNames = silkscreen.map((char) => `"char_${char.char_id}"`);
const characters = silkscreen
    .map((char) => String.fromCodePoint(char.char_id))
    .map((char) => `"${needToEscape.has(char) ? "\\" : ""}${char}"`);

// Create a typescript union type for all the names
const typescriptSpriteNameType = `export type SpriteTemplateName = ${spriteNames.join(" | ")};\n`;
const typescriptCharacterNameType = `export type CharacterTemplateName = ${characterNames.join(" | ")};\n`;
const typescriptCharacterType = `export type Characters = ${characters.join(" | ")};\n`;

// Read the current file contents and replace the old types with the new type
const sourceFile = new URL("../src/image-operations/load-template.ts", import.meta.url);
const fileContents = await fs.readFile(sourceFile, { encoding: "ascii" });
const updatedFileContents = fileContents
    .replaceAll(/export type SpriteTemplateName =\n?[\s\w"/|-]+;\n/gm, typescriptSpriteNameType)
    .replaceAll(/export type CharacterTemplateName =\n?[\s\w"/|-]+;\n/gm, typescriptCharacterNameType)
    .replaceAll(
        /export type Characters =\n?[\s\w!"#$%&'()*+,./:<=>?@[\\\]^`{|}~-]+(";")\n?[\s\w!"#$%&'()*+,./:<=>?@[\\\]^`{|}~-]+;\n/gm,
        typescriptCharacterType
    );

// Format the source code with prettier before writing it back to the file
const prettierConfig = await prettier.resolveConfig(import.meta.url, { editorconfig: true });
const formattedFileContents = await prettier.format(updatedFileContents, {
    parser: "typescript",
    ...prettierConfig,
    trailingComma: "es5",
});
await fs.writeFile(sourceFile, formattedFileContents);
