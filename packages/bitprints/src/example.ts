import type { ITinyTowerRebuildEventData } from "./strategies/rebuild-every-x-floors.js";

import { buildFloorCost } from "@tinyburg/nucleus/data/floors";
import { useStrategy, TinyTowerRebuildAsapStrategyStates } from "./strategies/rebuild-every-x-floors.js";

// eslint-disable-next-line @rushstack/typedef-var
const rebuildAsapStrategy = useStrategy();

rebuildAsapStrategy.on(TinyTowerRebuildAsapStrategyStates.BuildingNewFloor, async (from, event) => {
    console.log(`Event ${JSON.stringify(event)} triggered building the next floor transitioning from ${from}!`);
    console.log(`Done building floor number ${event.floors + 1}`);
    return { coins: event.coins - buildFloorCost(event.floors + 1), floors: event.floors + 1 };
});

rebuildAsapStrategy.on(TinyTowerRebuildAsapStrategyStates.Rebuilding, async (from, event) => {
    console.log(`Event ${JSON.stringify(event)} triggered rebuilding transitioning from ${from}!`);
    console.log("Done rebuilding");
});

// console.log(rebuildAsapStrategy.currentState());
// await rebuildAsapStrategy.feed({ coins: 5001, floors: 1 });
// console.log(rebuildAsapStrategy.currentState());
// await rebuildAsapStrategy.feed({ coins: 1_533_000, floors: 49 });
// console.log(rebuildAsapStrategy.currentState());

let state: ITinyTowerRebuildEventData = { coins: 25_000, floors: 1 };
setInterval(async () => {
    state.coins += 1000;
    // eslint-disable-next-line require-atomic-updates
    state = (await rebuildAsapStrategy.feed(state)) ?? state;
    console.log(state);
}, 1000 * 1);
