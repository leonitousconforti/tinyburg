import { type ViteUserConfig, mergeConfig } from "vitest/config";

import shared from "../../vitest.shared.ts";

const config: ViteUserConfig = {};

export default mergeConfig(shared, config);
