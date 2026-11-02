---
"@tinyburg/insight": minor
---

Run against an x86_64 emulator: the session attaches in Frida's emulated realm (TinyTower ships only ARM libraries, which run through Android's ARM translation there), the emulator starts `/data/local/tmp/frida-server` instead of a versioned arm64 build, and the SDK is found through `ANDROID_HOME` (as `@efffrida/frida-tools` does) instead of `ANDROID_SDK`.
