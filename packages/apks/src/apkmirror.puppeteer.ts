import type { IPuppeteerDetails } from "./details.puppeteer.js";

import { getApkpureDetails } from "./apkpure.puppeteer.js";

export const getApkmirrorDetails = async (): Promise<IPuppeteerDetails> => {
    return getApkpureDetails();
};
