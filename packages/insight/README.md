# @tinyburg/insight

provides information into and about TinyTower using frida.

## Running it

insight drives TinyTower on an Android emulator: an x86_64 Android 16 image,
where the game's ARM-only libraries run through Android's ARM translation and
the agent attaches in Frida's emulated realm. The emulator refuses arm64
images on an x86_64 host, and Android 14's translator kills the game on
instructions it does not support.

1. Enter the Android shell from the repository root: `nix develop .#android`.
   It carries the SDK, the emulator and the system image, and sets
   `ANDROID_HOME`.
2. The emulator needs `/dev/kvm`. In a Proxmox container, pass it through on
   the host with `pct set <id> --dev0 /dev/kvm,mode=0666` and restart the
   container.
3. Once: `packages/insight/scripts/setup-avd.sh` creates the `Small_Phone`
   AVD and puts a `frida-server` matching the `frida` package at
   `/data/local/tmp/frida-server`, then saves a snapshot that insight boots
   from. Rerun it after updating the flake: a new emulator or system image
   makes the snapshot unusable, and insight falls back to a full boot.

`DeviceLive` then boots `Small_Phone` read-only, installs TinyTower from
Google Play and starts `frida-server`.
