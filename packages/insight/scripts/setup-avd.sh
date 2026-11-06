#!/usr/bin/env bash
# One-time setup of the Android emulator insight drives. Delete the existing AVD
# with `avdmanager delete avd -n Small_Phone`

set -euo pipefail

avd="Small_Phone"
image="system-images;android-36;google_apis;x86_64"
frida_server=/data/local/tmp/frida-server

cd "$(dirname "$0")/.."
frida_version=$(node -p 'require("./package.json").dependencies.frida')

# The emulator this script boots is the only one running, so `adb -e` finds it.
device() { adb -e "$@"; }

# "no" answers avdmanager's question about a custom hardware profile.
echo no | avdmanager create avd --force -n "$avd" -k "$image" -d small_phone

# The small_phone profile asks for 1 GB, which the emulator raises to 2.5 GB.
# With TinyTower running that leaves the guest short of memory, and adb's
# connection to the emulator then drops mid-transfer, taking frida-server and
# its port forward with it. The RAM size is part of the snapshot saved below.
config="${ANDROID_AVD_HOME:-${ANDROID_USER_HOME:-$HOME/.android}/avd}/$avd.avd/config.ini"
sed -i 's/^hw\.ramSize=.*/hw.ramSize=4096/' "$config"
grep -qx 'hw.ramSize=4096' "$config"

# Download frida-server for the emulator's architecture and decompress it to a
# temporary file.
work=$(mktemp -d)
trap 'device emu kill >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
curl -fL --progress-bar \
    "https://github.com/frida/frida/releases/download/$frida_version/frida-server-$frida_version-android-x86_64.xz" |
    xz -d >"$work/frida-server"

# Same flags as insight, so it can load the snapshot saved below.
emulator "@$avd" -no-window -no-metrics -gpu swiftshader_indirect &
device wait-for-device
until [ "$(device shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
device root
device wait-for-device
device push "$work/frida-server" "$frida_server"
device shell chmod 755 "$frida_server"
# Without this the push can come back truncated on the next boot.
device shell sync
device emu kill

# The emulator keeps writing the snapshot while it shuts down.
wait
