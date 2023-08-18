/* eslint-disable @typescript-eslint/naming-convention */

import { buildFloorCost } from "@tinyburg/core/data/floors";
import { FiniteStateMachine } from "../fsm.js";

/**
 * The states for a basic TinyTower strategy where we rebuild immediately once
 * we hit the desired number of floors. During our game-play loop, we will wait
 * for enough coins to build the next floor. Once we have enough coins, we will
 * transition to building the next floor. At the end of building the next floor,
 * we will attempt to transition to rebuilding which can fail if we do not have
 * the desired number of floors built yet. After attempting to transition to
 * rebuilding, we will transition back to waiting for enough coins to build the
 * next floor.
 */
export const enum TinyTowerRebuildAsapStrategyStates {
    WaitingForCoins = "WaitingForCoins",
    BuildingNewFloor = "BuildingNewFloor",
    Rebuilding = "Rebuilding",
}

/**
 * The event data we will need to know when transitioning from one state to
 * another, this will be provided by tinyburg doorman at runtime whenever an
 * event is emitted.
 */
export interface ITinyTowerRebuildEventData {
    coins: number;
    floors: number;
}

export const useStrategy = (): FiniteStateMachine<TinyTowerRebuildAsapStrategyStates, ITinyTowerRebuildEventData> => {
    /**
     * Rebuild after 50 floors so we get a golden ticket every time. There is no
     * reason that this can't be a function that takes in the above event data
     * and makes a decision using more data, but for this example this will do.
     */
    const rebuildAtFloor: number = 50 as const;

    // Construct a new FSM, starting in the waiting for coins state
    const fsm = new FiniteStateMachine<TinyTowerRebuildAsapStrategyStates, ITinyTowerRebuildEventData>(
        TinyTowerRebuildAsapStrategyStates.WaitingForCoins
    );

    // Defines the waiting for coins to building the next floor transition
    fsm.from(TinyTowerRebuildAsapStrategyStates.WaitingForCoins).to(
        TinyTowerRebuildAsapStrategyStates.BuildingNewFloor
    );

    // Defines the build next floor to rebuilding or back to waiting for coins transitions
    fsm.from(TinyTowerRebuildAsapStrategyStates.BuildingNewFloor).to(TinyTowerRebuildAsapStrategyStates.Rebuilding);
    fsm.from(TinyTowerRebuildAsapStrategyStates.BuildingNewFloor).to(
        TinyTowerRebuildAsapStrategyStates.WaitingForCoins
    );

    // Defines the rebuilding to waiting for coins transition
    fsm.from(TinyTowerRebuildAsapStrategyStates.Rebuilding).to(TinyTowerRebuildAsapStrategyStates.WaitingForCoins);

    // Listen for transitions to building the next floor. If the callback returns
    // false, because we don't have enough coins yet, then the transition is canceled
    fsm.onEnter(
        TinyTowerRebuildAsapStrategyStates.BuildingNewFloor,
        (_from, event) => event.coins >= buildFloorCost(event.floors + 1)
    );

    // After all other building new floor listeners have ran, we can attempt to
    // transition to rebuilding.
    fsm.on(
        TinyTowerRebuildAsapStrategyStates.BuildingNewFloor,
        async (_from, event) => {
            const transitionedToRebuilding = await fsm.go(TinyTowerRebuildAsapStrategyStates.Rebuilding, event);
            if (!transitionedToRebuilding) await fsm.go(TinyTowerRebuildAsapStrategyStates.WaitingForCoins, event);
        },
        "Later"
    );

    // Listen for transitions to rebuilding. If the callback returns false, because
    // we haven't built the desired number of floors yet, then transition is canceled
    fsm.onEnter(TinyTowerRebuildAsapStrategyStates.Rebuilding, (_from, event) => event.floors >= rebuildAtFloor);

    // After all other rebuilding listeners have ran, we can transition back to
    // waiting for coins
    fsm.on(
        TinyTowerRebuildAsapStrategyStates.Rebuilding,
        async (_from, event) => {
            await fsm.go(TinyTowerRebuildAsapStrategyStates.WaitingForCoins, { ...event, floors: 1 });
        },
        "Later"
    );

    return fsm;
};
