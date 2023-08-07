#!/usr/bin/env bash
set -euo pipefail

/android/sdk/platform-tools/adb wait-for-device
sleep 2s
socat tcp-listen:27042,reuseaddr,fork tcp:127.0.0.1:27043 &
sleep 2s
/android/sdk/platform-tools/adb root
sleep 2s
/android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/
sleep 2s
/android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"
sleep 2s
/android/sdk/platform-tools/adb forward tcp:27043 tcp:27042
sleep 2s
/android/sdk/platform-tools/adb shell /data/local/tmp/frida-server
sleep 5s
