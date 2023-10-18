# @tinyburg/apks

Downloads and stores versions of nimblebit apps that I want tinyburg to support, ready to be consumed by other tools such as @tinyburg/architect or @tinyburg/insight. You specify the version to download as a string:

```ts
type version =
    | "latest version"
    | `${number} versions before latest`
    | `${number}.${number}.${number}`
    | `${eventVersion}`;
```

If you have previously requested the same game from the same supplier and the same version and the same architecture then the file will be supplied from the downloads cache folder, otherwise it will be downloaded from the requested supplier (either apkmirror or apkpure).

## Example usage

```js
// Either of these imports work
import loadApk from "@tinyburg/apks";
import { loadApk } from "@tinyburg/apks";

// Will get the "latest version" by default
const tinytower = await loadApk("TinyTower");

// You can request a custom version if desired
const tinytower = await loadApk("TinyTower", "4.24.0");
const tinytower = await loadApk("TinyTower", "Christmas 2022");
const tinytower = await loadApk("TinyTower", "4 versions before latest");

// These are all equivalent
const tinytower = await loadApk("TinyTower");
const tinytower = await loadApk("TinyTower", "latest version");
const tinytower = await loadApk("TinyTower", "0 versions before latest");

// Other games can be requested by
const legoTower = await loadApk("LegoTower");

// And you can choose the supplier to download apks from
const legoTowerApkPure = await loadApk("LegoTower", "latest version", "apkpure");
const legoTowerApkMirror = await loadApk("LegoTower", "latest version", "apkmirror");

// NOTE: TinyTowerVegas is only available from apkpure
const tinytowerVegas = await loadApk("TinyTowerVegas", "latest version", "apkpure");
```
