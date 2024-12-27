import Emittery from "emittery";

/**
 * @typedef IYourAgentExports
 * @property {import("../../src/shared/agent-main-export.js").TAgentMain<
 *     [],
 *     { version: string }
 * >} main
 */

/**
 * @typedef IIsMusicEnabledAgentExports
 * @property {import("../../src/shared/agent-main-export.js").TAgentMain<
 *     [],
 *     { musicEnabled: boolean }
 * >} main
 */

/**
 * @typedef ISetMusicEnabledAgentExports
 * @property {import("../../src/shared/agent-main-export.js").TAgentMain<
 *     [musicEnabled: boolean],
 *     { musicEnabled: boolean }
 * >} main
 */

/**
 * @typedef ISubscribeToMusicStatusAgent1Exports
 * @property {import("../../src/shared/agent-main-export.js").TAgentMain<
 *     [notificationCallback: (status: boolean) => void],
 *     void
 * >} main
 */

/**
 * @typedef ISubscribeToMusicStatusAgent2Events
 * @property {boolean} musicStatusChanged
 */

/**
 * @typedef ISubscribeToMusicStatusAgent2Exports
 * @property {import("../../src/shared/agent-main-export.js").TAgentMain<
 *     [],
 *     Emittery<ISubscribeToMusicStatusAgent2Events>
 * >} main
 */
