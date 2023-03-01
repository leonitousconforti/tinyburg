# @tinyburg/apks

an internal package that stores all versions of TinyTower that I want tinyburg to support, ready to be consumed by other tools such as @tinyburg/architect or @tinyburg/insight. There are downloaded apks from apkpure and apkmirror and they will never be uploaded to github because they are so large. I was going to get apks from gplaydl as well but the github issues recently seem to suggest that it is broken so I did not try it. This internal tool also supports patching the apks with frida-gadget and any mitm proxy certificates in case root is not available in the environment where TinyTower is going to be running or you want to analyze TinyTower web traffic.

## Future

thinking about also tracking major events and be able to load the versions for that event using this library too (like loading the version for the 2022 christmas event ect)

## Example usage

```bash
# Use the patch apk python script to insert frida gadget into any apk
./downloads/patch-apk.py "./downloads/apkpure/Tiny Tower_ 8 Bit Retro Tycoon_4.14.0_Apkpure.apk"

# After downloading any apk into the apkpure or apkmirror download folders,
# you should regenerate the typescript types for this package using the
# gen-ts-type python script
./downloads/gen-ts-types.py
```

then to load any of the apks for use in a different typescript package

```js
// These are equivalent
import loadApk from "@tinyburg/apks";
import { loadApk } from "@tinyburg/apks";

// Or to load from a specific download source
import { loadPatchedApk } from "@tinyburg/apks";
import { loadApkFromApkpure } from "@tinyburg/apks";
import { loadApkFromApkmirror } from "@tinyburg/apks";

const apk = loadApk("apkpure", "4.14.0")
const apk1 = loadApkFromApkpure("4.14.0");
const apk2 = loadApkFromApkmirror("4.14.0");
const apk3 = loadPatchedApk("apkpure-4.14.0-with-frida-gadget");
```

Otherwise, you can push any patched apk straight to an emulator the connect with

```bash
frida -U --attach-name Gadget
```
