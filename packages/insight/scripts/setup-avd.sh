#!/usr/bin/env bash
# One-time setup of the Android emulator insight drives.
set -euo pipefail

avd="Small_Phone"
image="system-images;android-34;google_apis;x86_64"
frida_server=/data/local/tmp/frida-server

cd "$(dirname "$0")/.."
frida_version=$(node -p 'require("./package.json").dependencies.frida')

# The emulator this script boots is the only one running, so `adb -e` finds it.
device() { adb -e "$@"; }

# "no" answers avdmanager's question about a custom hardware profile.
echo no | avdmanager create avd --force -n "$avd" -k "$image" -d small_phone

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
device emu kill

# The emulator keeps writing the snapshot while it shuts down.
wait
