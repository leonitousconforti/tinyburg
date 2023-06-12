import type { Touch as _Touch } from "@tinyburg/architect/protobuf/emulator_controller.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { Touch_EventExpiration } from "@tinyburg/architect/protobuf/emulator_controller.js";

// Override some of the properties to be required
export type Touch = {
    x: number;
    y: number;
    pressure: number;
    timeout?: number;
    expiration: Touch_EventExpiration;
};

export const sendTouches = async (client: EmulatorControllerClient, touches: Touch[]) => {
    const randomIdentifier = Math.floor(Math.random() * 100);

    // For every touch event
    for (const touch of touches) {
        // Assign a random identifier to all touches that do not have one already
        const emulatorTouch: _Touch = { identifier: randomIdentifier, touchMajor: 0, touchMinor: 0, ...touch };

        // Send the touch
        await client.sendTouch({ touches: [emulatorTouch], display: 0 });

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
    const pressTouch: Touch = {
        x,
        y,
        timeout,
        pressure: 1,
        expiration: Touch_EventExpiration.EVENT_EXPIRATION_UNSPECIFIED,
    };
    const releaseTouch: Touch = {
        x,
        y,
        timeout: 0,
        pressure: 0,
        expiration: Touch_EventExpiration.EVENT_EXPIRATION_UNSPECIFIED,
    };
    return sendTouches(client, [pressTouch, releaseTouch]);
};
