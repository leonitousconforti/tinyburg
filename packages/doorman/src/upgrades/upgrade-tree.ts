import type { IUpgrade } from "./base-upgrade.js";

export class UpgradeTree {
    private readonly _upgrades: IUpgrade[][];
    private readonly _currentUpgrade: IUpgrade[];

    public constructor() {
        this._upgrades = [];
        this._currentUpgrade = [];
    }

    public getNext() {
        return this._currentUpgrade;
    }

    public add(...upgrades: IUpgrade[]): void {
        this._upgrades.push(upgrades);
    }
}
