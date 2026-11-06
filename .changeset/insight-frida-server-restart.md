---
"@tinyburg/insight": patch
---

`DeviceLive` restarts `frida-server` when it exits, at most 5 times, through the new `@efffrida/frida-tools`. Sessions on the old server detach.
