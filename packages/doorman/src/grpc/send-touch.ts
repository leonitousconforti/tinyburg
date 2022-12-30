import type { Touch as _Touch } from "../../proto/generated/android/emulation/control/Touch.js";
import type { EmulatorControllerClient } from "../../proto/generated//android/emulation/control/EmulatorController.js";

// Override some of the properties to be required
export type Touch = _Touch & {
    x: number;
    y: number;
    pressure: number;
    timeout?: number;
    expiration: "EVENT_EXPIRATION_UNSPECIFIED" | "NEVER_EXPIRE";
};

export const sendTouches = async (client: EmulatorControllerClient, touches: Touch[]) => {
    const randomIdentifier = Math.floor(Math.random() * 100);

    // For every touch event
    for (const touch of touches) {
        // Assign a random identifier to all touches that do not have one already
        if (!touch.identifier) {
            touch.identifier = randomIdentifier;
        }

        // Send the touch
        client.sendTouch({ touches: [touch] }, async (error) => {
            if (error) throw error;
        });

        // And wait for the timeout if there is one
        if (touch.timeout) {
            await new Promise((resolve) => setTimeout(resolve, touch.timeout));
        }
    }
};

export const click = (
    client: EmulatorControllerClient,
    { x, y, timeout }: { x: number; y: number; timeout?: number }
) => {
    const pressTouch: Touch = { x, y, timeout, pressure: 1, expiration: "EVENT_EXPIRATION_UNSPECIFIED" };
    const releaseTouch: Touch = { x, y, timeout: 0, pressure: 0, expiration: "EVENT_EXPIRATION_UNSPECIFIED" };
    return sendTouches(client, [pressTouch, releaseTouch]);
};
