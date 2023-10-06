import type { PromiseClient } from "@connectrpc/connect";
import type { IUpgrade } from "./upgrades/base-upgrade.js";
import type { BaseAction } from "./actions/base-action.js";
import type { IGlobalGameState } from "./global-game-state.js";
import type { BaseHandler, IHandlerName } from "./handlers/base-handler.js";

import Emittery from "emittery";
import { getScreenshot } from "./grpc/get-screenshots.js";
import { ElevatorHandler } from "./handlers/elevator-handler.js";
import { BitbookPostHandler } from "./handlers/bitbook-handler.js";
import { RestockHandler, StockMode } from "./handlers/restock-handler.js";
import { createEmulatorControllerClient } from "./grpc/emulator-controller-client.js";
import { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

export class Doorman extends Emittery<
    {
        upgradeRequest: IUpgrade;
        gameStateUpdate: IGlobalGameState;
    } & {
        [h in IHandlerName]: BaseAction[];
    }
> {
    private readonly _emulatorControllerClient: PromiseClient<typeof EmulatorController>;

    private _handlers: Set<BaseHandler<unknown>>;

    public constructor(emulatorAddress: string) {
        super();
        this._emulatorControllerClient = createEmulatorControllerClient(emulatorAddress);
        this._handlers = new Set();

        this.on("Default Bitbook Note Handler", this.executeActions);
        this.on("Default Elevator Ride Handler", this.executeActions);
        this.on("Default Restocking Handler", this.executeActions);
    }

    public async poll(): Promise<void> {
        for (const handler of this._handlers) {
            const screenshot = await getScreenshot(this._emulatorControllerClient);
            const triggerData = handler.detectTrigger(screenshot);

            if (triggerData) {
                const actions = await handler.generateActionsList(
                    this._emulatorControllerClient,
                    screenshot,
                    triggerData
                );
                await this.emit(handler.name, actions);
            }
        }
    }

    public async executeActions(actions: BaseAction[]): Promise<void> {
        for (const action of actions) {
            await action.do();
        }
    }

    public addHandlers(...handlers: BaseHandler<unknown>[]): void {
        for (const handler of handlers) {
            this._handlers.add(handler);
        }
    }

    public removeHandlers(...handlerNames: IHandlerName[]): void {
        for (const handlerName of handlerNames) {
            for (const handler of this._handlers) {
                if (handler.name === handlerName) {
                    this._handlers.delete(handler);
                }
            }
        }
    }

    public static defaultHandlers(): BaseHandler<unknown>[] {
        return [new BitbookPostHandler(), new ElevatorHandler(), new RestockHandler(StockMode.STOCK_ALL)];
    }
}

export default Doorman;
