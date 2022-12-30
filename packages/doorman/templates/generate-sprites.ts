import fs from "node:fs";
import sharp from "sharp";
import path from "node:url";

// Load the game sprite sheet and metadata. These need to be extracted from the game's
// resource files, there are lots of free open source tools out there that do this.
import sprites from "./game.json" assert { type: "json" };
const spritesImage = sharp(path.fileURLToPath(new URL("game.png", import.meta.url)));

// Ensure that all output folders have been created
for (const folder of ["./png", "./raw", "./metadata"]) {
    const folderPath = path.fileURLToPath(new URL(folder, import.meta.url));
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
}

// For each sprite entry, get its region
for (const [spriteName, spriteJsonData] of Object.entries(sprites.sprites)) {
    const frame = spriteJsonData.frame;
    const region = {
        top: frame.y,
        left: frame.x,
        width: frame.w,
        height: frame.h,
    };

    // Setup output file paths
    const spriteNameNoExtension = spriteName.slice(0, spriteName.lastIndexOf("."));
    const spritePngPath = path.fileURLToPath(new URL(`png/${spriteName}`, import.meta.url));
    const spriteRawPath = path.fileURLToPath(new URL(`raw/${spriteNameNoExtension}.bin`, import.meta.url));
    const spriteMetadataPath = path.fileURLToPath(new URL(`metadata/${spriteNameNoExtension}.json`, import.meta.url));

    // Create recursive file paths if necessary
    if (spriteNameNoExtension.includes("/")) {
        const spritePngFolder = spritePngPath.slice(0, spritePngPath.lastIndexOf("/"));
        const spriteRawFolder = spriteRawPath.slice(0, spriteRawPath.lastIndexOf("/"));
        const spriteMetadataFolder = spriteMetadataPath.slice(0, spriteMetadataPath.lastIndexOf("/"));
        if (!fs.existsSync(spritePngFolder)) fs.mkdirSync(spritePngFolder, { recursive: true });
        if (!fs.existsSync(spriteRawFolder)) fs.mkdirSync(spriteRawFolder, { recursive: true });
        if (!fs.existsSync(spriteMetadataFolder)) fs.mkdirSync(spriteMetadataFolder, { recursive: true });
    }

    // Extract the sprite by its region and write to files
    const sprite = spritesImage.clone().extract(region);
    const spriteRawBuffer = await sprite.raw().toBuffer();
    const spriteMetadata = await sprite.png().toFile(spritePngPath);
    fs.writeFileSync(spriteRawPath, spriteRawBuffer);
    fs.writeFileSync(spriteMetadataPath, JSON.stringify(spriteMetadata));
}
