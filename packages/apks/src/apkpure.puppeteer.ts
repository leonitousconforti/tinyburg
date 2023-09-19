// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { IPuppeteerDetails, RequestedGame, RequestedArchitecture } from "./types.js";

import Debug from "debug";
import puppeteer from "puppeteer";

const logger: Debug.Debugger = Debug.debug("tinyburg:apks:puppeteer:apkpure");

/** These are the pages where we will start trying to download from for each game */
const productPages: { [k in RequestedGame]: string } = {
    LegoTower: "https://apkpure.com/lego%C2%AE-tower/com.nimblebit.legotower/versions",
    TinyTowerVegas: "https://apkpure.com/tiny-tower-vegas/com.nimblebit.vegas/versions",
    TinyTower: "https://apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower/download",
};

export const getApkpureDetails = async (
    game: RequestedGame,
    versionsBeforeLatest: number,
    architecture: RequestedArchitecture
): Promise<[downloadUrl: string, details: IPuppeteerDetails]> => {
    throw new Error("Not implemented");
};
