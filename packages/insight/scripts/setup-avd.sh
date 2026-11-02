#!/usr/bin/env bash
# One-time setup of the emulator insight drives. Run it inside
# `nix develop .#android`, on a host with /dev/kvm. It
#   - creates the Small_Phone AVD: Android 14 with Google APIs (so `adb root`
#     works), x86_64 (TinyTower's ARM code runs through Android's ARM
#     translation, and insight attaches in Frida's emulated realm);
#   - boots it once, writable, and puts a frida-server matching the `frida`
#     package at /data/local/tmp/frida-server, where insight starts it.
# insight boots the AVD read-only after that, so nothing it does is kept.
# Extra emulator flags can be passed as arguments (e.g. `-accel off`).
set -euo pipefail

cd "$(dirname "$0")/.."
version=$(node -p 'require("./package.json").dependencies.frida')
avd=Small_Phone
serial=emulator-5590

if ! avdmanager list avd -c 2>/dev/null | grep -qx "$avd"; then
    echo no | avdmanager create avd -n "$avd" -k "system-images;android-34;google_apis;x86_64" -d small_phone >/dev/null 2>&1
fi

work=$(mktemp -d)
trap 'adb -s "$serial" emu kill >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

curl -fsSL "https://github.com/frida/frida/releases/download/$version/frida-server-$version-android-x86_64.xz" |
    xz -d >"$work/frida-server"

emulator "@$avd" -port 5590 -no-window -no-audio -no-metrics -no-snapshot -no-boot-anim \
    -gpu swiftshader_indirect "$@" >"$work/emulator.log" 2>&1 &
adb -s "$serial" wait-for-device
until [ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 5; done
adb -s "$serial" root >/dev/null
adb -s "$serial" wait-for-device
adb -s "$serial" push "$work/frida-server" /data/local/tmp/frida-server >/dev/null
adb -s "$serial" shell chmod 755 /data/local/tmp/frida-server
# Flush before the exit trap kills the emulator, which does not always shut
# down cleanly.
adb -s "$serial" shell sync
echo "$avd is ready: frida-server $version at /data/local/tmp/frida-server"
