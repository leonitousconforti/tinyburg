import type { IUpgrade } from "./upgrades/base-upgrade.js";
import type { BaseAction } from "./actions/base-action.js";
import type { IGlobalGameState } from "./global-game-state.js";
import type { BaseHandler, IHandlerName } from "./handlers/base-handler.js";
import type { EmulatorControllerClient } from "../proto/generated/android/emulation/control/EmulatorController.js";

import Emittery from "emittery";
import { getScreenshot } from "./grpc/get-screenshots.js";
import { ElevatorHandler } from "./handlers/elevator-handler.js";
import { BitbookPostHandler } from "./handlers/bitbook-handler.js";
import { RestockHandler, StockMode } from "./handlers/restock-handler.js";
import { createEmulatorControllerClient } from "./grpc/emulator-controller-client.js";

export class Doorman extends Emittery<
    {
        upgradeRequest: IUpgrade;
        gameStateUpdate: IGlobalGameState;
    } & {
        [h in IHandlerName]: BaseAction[];
    }
> {
    private _handlers: Set<BaseHandler<unknown>>;
    private readonly _emulatorControllerClient: EmulatorControllerClient;

    public constructor(emulatorAddress: string, pollInterval: number) {
        super();
        this._emulatorControllerClient = createEmulatorControllerClient(emulatorAddress);
        this._handlers = new Set();
        setInterval(this.poll, pollInterval);

        this.on("BitbookNote", this.executeActions);
        this.on("ElevatorRider", this.executeActions);
        this.on("NewMission", this.executeActions);
        this.on("RestockDone", this.executeActions);
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

    public addHandlers(...handlers: BaseHandler<unknown>[]) {
        for (const handler of handlers) {
            this._handlers.add(handler);
        }
    }

    public removeHandlers(...handlerNames: IHandlerName[]) {
        for (const handlerName of handlerNames) {
            for (const handler of this._handlers) {
                if (handler.name === handlerName) {
                    this._handlers.delete(handler);
                }
            }
        }
    }

    public defaultHandlers() {
        return [new BitbookPostHandler(), new ElevatorHandler(), new RestockHandler(StockMode.STOCK_ALL)];
    }
}
