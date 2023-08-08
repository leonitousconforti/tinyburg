import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

export interface IGlobalGameState {
    version: string;
    coins: number;
    bux: number;
    goldTickets: number;
    floors: number;
    bitizens: number;
    nextFloorCost: number;
    elevatorSpeed: number;
    upgradeElevatorCost: number;
    gameScreen: GameScreen;
}
export type GlobalGameStateUpdate = Exclude<keyof IGlobalGameState, "version" | "screen">;
export enum GameScreen {
    Tower,
    Hud,
    Bitbook,
    Bitizens,
    Friends,
    Raffle,
    Rebuild,
    Settings,
    TechTree,
    Upgrades,
    Mission,
}

export class GlobalGameStateHolder {
    private _coins: number;
    private _bux: number;
    private _goldTickets: number;
    private _floors: number;
    private _bitizens: number;
    private _nextFloorCost: number;
    private _elevatorSpeed: number;
    private _upgradeElevatorCost: number;
    private _queuedUpdates: Set<GlobalGameStateUpdate>;
    private _screen: GameScreen = GameScreen.Tower;
    private readonly _version: string;

    private static _instance: GlobalGameStateHolder;

    private constructor() {
        this._bux = 0;
        this._coins = 0;
        this._floors = 1;
        this._bitizens = 0;
        this._goldTickets = 0;
        this._elevatorSpeed = 1;
        this._version = "0.0.0";
        this._nextFloorCost = Number.POSITIVE_INFINITY;
        this._upgradeElevatorCost = Number.POSITIVE_INFINITY;

        this._queuedUpdates = new Set();
        this.queueGameStateUpdates(
            "bux",
            "coins",
            "elevatorSpeed",
            "floors",
            "goldTickets",
            "nextFloorCost",
            "upgradeElevatorCost"
        );
    }

    public static getInstance(): GlobalGameStateHolder {
        if (!this._instance) {
            this._instance = new GlobalGameStateHolder();
        }
        return this._instance;
    }

    public useGlobalGameState(): IGlobalGameState {
        return {
            version: this._version,
            coins: this._coins,
            bux: this._bux,
            goldTickets: this._goldTickets,
            floors: this._floors,
            bitizens: this._bitizens,
            nextFloorCost: this._nextFloorCost,
            elevatorSpeed: this._elevatorSpeed,
            upgradeElevatorCost: this._upgradeElevatorCost,
            gameScreen: this._screen,
        };
    }

    public queueGameStateUpdates(...updates: GlobalGameStateUpdate[]): void {
        for (const update of updates) this._queuedUpdates.add(update);
    }

    public async updateGlobalGameState(_client?: EmulatorControllerClient): Promise<boolean> {
        // Check if there are any updates to perform
        if (this._queuedUpdates.size === 0) {
            return true;
        }

        // Perform the requested updates in the queue by analyzing screenshots

        this._queuedUpdates.clear();
        return true;
    }

    public setScreen(screen: GameScreen): void {
        this._screen = screen;
    }
}
