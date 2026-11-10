---
"@tinyburg/insight": minor
---

Each game SDK now keeps its agent and the scripts that load it in a `frida` folder, and insight keeps what they share. `shared/Rpcs` is now only `Version` (read from Unity's `Application.version`) and `SetFps`; `frida/Agent` has their handlers, helpers for reading il2cpp data and `serve`; and the new `node/Generate` has the helpers for an SDK's `pnpm generate`. Tiny Tower's own RPCs and agent move to tinytower-sdk. `DeviceLive`, `SessionLive`, `ScriptLive`, `AgentLive` and `AgentWatched` give way to `layerDevice(bundleIdentifier)`, which installs any game, `layerAgent(bundleIdentifier, agent)` and `watchAgent(bundleIdentifier, agent, effect)`, and `layerPlay` provides Google Play with an anonymous Aurora Store account.
