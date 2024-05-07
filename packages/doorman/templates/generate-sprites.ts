import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import sharp from "sharp";

// Load the game sprite sheet and metadata. These need to be extracted from the game's
// resource files, there are lots of free open source tools out there that do this.
import sprites from "./game.json";
const spritesImage = sharp(url.fileURLToPath(new URL("game.png", import.meta.url)));

// Ensure that all output folders have been created
const ensureAllDirectoriesExist = (paths: string[]): Promise<(string | undefined)[]> =>
    Promise.all(paths.map((path) => fs.mkdir(path, { recursive: true })));

await ensureAllDirectoriesExist([
    url.fileURLToPath(new URL("png", import.meta.url)),
    url.fileURLToPath(new URL("raw", import.meta.url)),
    url.fileURLToPath(new URL("metadata", import.meta.url)),
]);

// For each sprite entry, get its region
const extractSprite = async (spriteName: string): Promise<void> => {
    const frame = sprites.frames[spriteName as keyof typeof sprites.frames].frame;
    const region = {
        top: frame.y,
        left: frame.x,
        width: frame.w,
        height: frame.h,
    };

    // Setup output file paths
    const spriteNameNoExtension = spriteName.slice(0, spriteName.lastIndexOf("."));
    const spritePngPath = url.fileURLToPath(new URL(`png/${spriteName}`, import.meta.url));
    const spriteRawPath = url.fileURLToPath(new URL(`raw/${spriteNameNoExtension}.bin`, import.meta.url));
    const spriteMetadataPath = url.fileURLToPath(new URL(`metadata/${spriteNameNoExtension}.json`, import.meta.url));

    // Create recursive file paths if necessary
    if (spriteNameNoExtension.includes("/")) {
        const spritePngFolder = spritePngPath.slice(0, spritePngPath.lastIndexOf("/"));
        const spriteRawFolder = spriteRawPath.slice(0, spriteRawPath.lastIndexOf("/"));
        const spriteMetadataFolder = spriteMetadataPath.slice(0, spriteMetadataPath.lastIndexOf("/"));
        await ensureAllDirectoriesExist([spritePngFolder, spriteRawFolder, spriteMetadataFolder]);
    }

    // Extract the sprite by its region and write to files
    const sprite = spritesImage.clone().extract(region);
    const spriteRawBuffer = await sprite.raw().toBuffer();
    const spriteMetadata = await sprite.png().toFile(spritePngPath);
    await Promise.all([
        fs.writeFile(spriteRawPath, spriteRawBuffer),
        fs.writeFile(spriteMetadataPath, JSON.stringify(spriteMetadata)),
    ]);
};

const findAllSpritesUsed = async (sourceDirectory: string): Promise<string[]> => {
    const regex = /loadTemplateByName\("(\w+)"\)/gm;
    const spriteNames: Set<string> = new Set();

    async function traverse(directory: string): Promise<void> {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                await traverse(filePath);
            } else if (stat.isFile()) {
                const content: string = await fs.readFile(filePath, "utf8");
                const matches: RegExpMatchArray[] = [...content.matchAll(regex)];

                for (const match of matches) {
                    spriteNames.add(match[1]);
                }
            }
        }
    }

    await traverse(sourceDirectory);
    return [...spriteNames].map((name) => `${name}.png`);
};

const allSpritesUsed = await findAllSpritesUsed(url.fileURLToPath(new URL("../src", import.meta.url)));
await Promise.all(allSpritesUsed.map((spriteName) => extractSprite(spriteName)));
