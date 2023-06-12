import type { Image } from "../image-operations/image.js";
import type { BaseAction } from "../actions/base-action.js";
import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

interface IHandlerNames {
    RestockDone: "Default Restocking Handler";
    BitbookNote: "Default Bitbook Note Handler";
    ElevatorRider: "Default Elevator Ride Handler";
}
export type IHandlerName = IHandlerNames[keyof IHandlerNames];

// A location where a trigger was detected
export interface ITriggerLocation {
    x: number;
    y: number;
}

// A handler is responsible for playing part of the game. A base handler
// has two methods, detectTrigger and performTask. If a truthy value is
// returned from the detectTrigger method, then that value should be passed
// to the performTask method as the triggerData.
export abstract class BaseHandler<T> {
    public readonly name: IHandlerName;

    public constructor(name: IHandlerName) {
        this.name = name;
    }

    // Attempts to locate this handlers trigger given a screenshot of the game.
    public abstract detectTrigger(screenshot: Image): Promise<T | undefined>;

    // When a trigger is detected, this method should perform the necessary actions in game.
    public abstract generateActionsList(
        client: EmulatorControllerClient,
        initialScreenshot: Image,
        triggerData: T
    ): Promise<BaseAction[]>;
}
