import { useStrategy, TinyTowerRebuildAsapStrategyStates } from "./strategies/rebuild-every-x-floors.js";

// eslint-disable-next-line @rushstack/typedef-var
const rebuildAsapStrategy = useStrategy();

rebuildAsapStrategy.on(TinyTowerRebuildAsapStrategyStates.BuildingNewFloor, async (from, event) => {
    console.log(`Event ${JSON.stringify(event)} triggered building the next floor transitioning from ${from}!`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`Done building floor number ${event.floors + 1}`);
    return { ...event, floors: event.floors + 1 };
});

rebuildAsapStrategy.on(TinyTowerRebuildAsapStrategyStates.Rebuilding, async (from, event) => {
    console.log(`Event ${JSON.stringify(event)} triggered rebuilding transitioning from ${from}!`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log("Done rebuilding");
});

console.log(rebuildAsapStrategy.currentState());
await rebuildAsapStrategy.feed({ coins: 5001, floors: 1 });
console.log(rebuildAsapStrategy.currentState());
await rebuildAsapStrategy.feed({ coins: 1_533_000, floors: 49 });
console.log(rebuildAsapStrategy.currentState());
