export interface IGlobalGameState {
    version: string;
    coins: number;
    bux: number;
    goldTickets: number;
    floors: number;
    bitizens: number;
    elevatorSpeed: number;
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
    Unknown,
}

export class GlobalGameStateHolder {
    private _coins: number;
    private _bux: number;
    private _goldTickets: number;
    private _floors: number;
    private _bitizens: number;
    private _elevatorSpeed: number;
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
            // nextFloorCost: this._nextFloorCost,
            elevatorSpeed: this._elevatorSpeed,
            // upgradeElevatorCost: this._upgradeElevatorCost,
            gameScreen: this._screen,
        };
    }

    public setScreen(screen: GameScreen): void {
        this._screen = screen;
    }
}
