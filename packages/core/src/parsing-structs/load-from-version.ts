import semver from "semver";
import prompts from "prompts";
import { blocks } from "./blocks.js";
import * as fs from "node:fs/promises";
import { floorBlocks } from "./floor.js";
import { missionBlocks } from "./mission.js";
import { bitizenBlocks } from "./bitizen.js";
import { DebugLogger, ILogger } from "../logger.js";
import { bitbookPostBlocks } from "./bitbook-posts.js";

// Debug logger
const loggingNamespace = "tinyburg:struct_loader";
const debug = new DebugLogger(loggingNamespace);

// Load structs from version function return type
export interface IStructs {
    bitbookPostBlocks: typeof bitbookPostBlocks;
    bitizenBlocks: typeof bitizenBlocks;
    blocks: typeof blocks;
    floorBlocks: typeof floorBlocks;
    missionBlocks: typeof missionBlocks;
}

// Attempts to load the struct from a particular version
export const loadFromVersion = async (version: string, force = false, log: ILogger = debug): Promise<IStructs> => {
    log.debug("Attempting to load structs for version: %s", version);

    // Filter the folders in this directory for ones that match the version
    const folders = await fs.readdir(new URL(".", import.meta.url), { withFileTypes: true });
    const versionFolders = folders
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => name !== "common");

    // Check if there exists a folder for this specific version
    const versionFolder = versionFolders.find((name) => name === `v${version}`);

    // Attempt to load the modules if the version exists
    if (versionFolder) {
        log.debug("Found structs for version: %s!", version);

        const { bitbookPostBlocks } = await import(`./${versionFolder}/bitbook-posts.js`);
        const { bitizenBlocks } = await import(`./${versionFolder}/bitizen.js`);
        const { blocks } = await import(`./${versionFolder}/blocks.js`);
        const { floorBlocks } = await import(`./${versionFolder}/floor.js`);
        const { missionBlocks } = await import(`./${versionFolder}/mission.js`);

        log.debug("Loaded structs, %O", {
            bitbookPostBlocks,
            bitizenBlocks,
            blocks,
            floorBlocks,
            missionBlocks,
        });

        return {
            bitbookPostBlocks,
            bitizenBlocks,
            blocks,
            floorBlocks,
            missionBlocks,
        };
    }

    // Find the version folder for the same major and minor version with the closest patch version
    else {
        const parsedVersion = semver.coerce(version);
        const major = Number.isNaN(parsedVersion?.major) ? "undefined" : parsedVersion?.major;
        const minor = Number.isNaN(parsedVersion?.minor) ? "undefined" : parsedVersion?.minor;
        const patch = Number.isNaN(parsedVersion?.patch) ? "undefined" : parsedVersion?.patch;
        log.debug(
            "No structs exist for this version, searching for structs with major %s, minor %s, patch <=%s",
            major,
            minor,
            patch
        );

        // Find all the version folders less than the requested versions patch but on the same major and minor, then reverse sort them
        const versionsLessThanFolders = versionFolders.filter((name) => semver.lt(name, version));
        const versionsInRangeFolder = versionsLessThanFolders.filter((name) => semver.gte(name, `${major}.${minor}.0`));
        const sorted = semver.rsort(versionsInRangeFolder);

        // If there exists a version folder less than the requested versions patch
        if (sorted.length > 0) {
            log.debug("loading struct from version %s", sorted[0]);

            const { bitbookPostBlocks } = await import(`./${sorted[0]}/bitbook-posts.js`);
            const { bitizenBlocks } = await import(`./${sorted[0]}/bitizen.js`);
            const { blocks } = await import(`./${sorted[0]}/blocks.js`);
            const { floorBlocks } = await import(`./${sorted[0]}/floor.js`);
            const { missionBlocks } = await import(`./${sorted[0]}/mission.js`);

            log.debug("Loaded structs, %O", {
                bitbookPostBlocks,
                bitizenBlocks,
                blocks,
                floorBlocks,
                missionBlocks,
            });

            return {
                bitbookPostBlocks,
                bitizenBlocks,
                blocks,
                floorBlocks,
                missionBlocks,
            };
        }

        log.debug("No structs could be found for same major same minor version");
    }

    // Not force loading and process.stdout is not a terminal, so throw an error
    if (!force && !process.stdout.isTTY) {
        return log.fatal(
            new Error(
                "Refusing to load structs because the force flag was not set and process.stdout is not a tty so we could not confirm using the default structs"
            )
        );
    }

    // Otherwise, since process.stdout is a tty we can confirm
    else if (!force && process.stdout.isTTY) {
        const confirmation = await prompts({
            type: "confirm",
            name: "force load structs",
            message: "No structs were found for your version, would you like to force load the default structs",
        });

        if (!confirmation) {
            return log.fatal(
                new Error("Could not load any structs for your version, please use a supported version of TinyTower")
            );
        }
    }

    // Otherwise return the default, most recent, version
    log.debug("Could not find structs for version: %s, defaulting to the symlinked structs", version);

    return {
        bitbookPostBlocks: bitbookPostBlocks,
        bitizenBlocks: bitizenBlocks,
        blocks: blocks,
        floorBlocks: floorBlocks,
        missionBlocks: missionBlocks,
    };
};
