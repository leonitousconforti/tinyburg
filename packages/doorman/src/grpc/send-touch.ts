import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import { Touch_EventExpiration, Touch as _Touch } from "@tinyburg/architect/protobuf/emulator_controller_pb.js";

// Override some of the properties to be required
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Touch = {
    x: number;
    y: number;
    pressure: number;
    timeout?: number;
    expiration: Touch_EventExpiration;
};

export const sendTouches = async (
    client: PromiseClient<typeof EmulatorController>,
    touches: Touch[]
): Promise<void> => {
    const randomIdentifier = Math.floor(Math.random() * 100);

    // For every touch event
    for (const touch of touches) {
        // Assign a random identifier to all touches that do not have one already
        const emulatorTouch: _Touch = new _Touch({
            identifier: randomIdentifier,
            touchMajor: 0,
            touchMinor: 0,
            ...touch,
        });

        // Send the touch
        await client.sendTouch({ touches: [emulatorTouch], display: 0 });

        // And wait for the timeout if there is one
        if (touch.timeout) {
            await new Promise((resolve) => setTimeout(resolve, touch.timeout));
        }
    }
};

export const click = (
    client: PromiseClient<typeof EmulatorController>,
    { x, y, timeout }: { x: number; y: number; timeout?: number }
): Promise<void> => {
    const pressTouch: Touch = {
        x,
        y,
        pressure: 1,
        timeout: timeout || 600,
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
