# @tinyburg/fount

Downloads, stores, and patches any version of nimblebit android apks that are available on the Google PlayStore, ready to be consumed by other tools such as @tinyburg/architect or @tinyburg/insight.

You specify the game to download as an enum value:

```ts
export enum Games {
    BitCity = "com.nimblebit.bitcity",
    TinyTower = "com.nimblebit.tinytower",
    LegoTower = "com.nimblebit.legotower",
    TinyTowerVegas = "com.nimblebit.vegas",
    PocketFrogs = "com.nimblebit.pocketfrogs",
    PocketPlanes = "com.nimblebit.pocketplanes",
    PocketTrains = "com.nimblebit.pockettrains",
}
```

You specify the version to download as a string:

```ts
type version =
    | "latest version"
    | `${number} versions before latest`
    | `${number}.${number}.${number}`
    | `${eventVersionForSpecificGame}`;
```

If you have previously requested the same game and the same version then the file will be supplied from the downloads cache folder, otherwise it will be downloaded directly from the play store using a link generated from apksupport.

## Example usage

```js
// Either of these imports work
import { loadApk, patchApk, Games } from "@tinyburg/apks";
import apks from "@tinyburg/apks";
const Games = apks.Games;
const loadApk = apks.loadApk;
const patchApk = apks.patchApk;

// Will get the "latest version" by default directly from the play store
const tinytower = await loadApk(Games.TinyTower);

// You can request a custom version if desired
const tinytower = await loadApk(Games.TinyTower, "4.24.0");
const tinytower = await loadApk(Games.TinyTower, "Christmas 2022");
const tinytower = await loadApk(Games.TinyTower, "4 versions before latest");

// These are all equivalent
const tinytower = await loadApk(Games.TinyTower);
const tinytower = await loadApk(Games.TinyTower, "latest version");
const tinytower = await loadApk(Games.TinyTower, "0 versions before latest");

// Other games can be requested by
const legoTower = await loadApk(Games.LegoTower);

// You can patch an apk with
const patchedTinyTower = await patchApk(Games.TinyTower);
const patchedTinyTower2 = await patchApk(Games.TinyTower, "4 versions before latest");
```

## TODO

[ ] - replace execa with @effect/platform command executor
