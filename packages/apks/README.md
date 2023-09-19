# @tinyburg/apks

An internal package that stores all versions of TinyTower that I want tinyburg to support, ready to be consumed by other tools such as @tinyburg/architect or @tinyburg/insight.

## Future

I'm Thinking about also tracking major events and be able to load the versions for that event using this library too (like loading the version for the 2022 christmas event etc)

## Example usage

```js
// These are equivalent
import loadApk from "@tinyburg/apks";
import { loadApk } from "@tinyburg/apks";

const tinytower1 = loadApk("TinyTower");
const tinytower2 = loadApk("TinyTower", "4 versions before latest");

const legotower1 = loadApk("LegoTower");
const legotower2 = loadApk("LegoTower", "13 versions before latest");
```
