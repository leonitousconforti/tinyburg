#!/usr/bin/env bash
set -euo pipefail

/android/sdk/platform-tools/adb wait-for-device
socat tcp-listen:27042,reuseaddr,fork tcp:127.0.0.1:27043 &
/android/sdk/platform-tools/adb root
/android/sdk/platform-tools/adb shell "setenforce 0"
/android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/
/android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"
/android/sdk/platform-tools/adb forward tcp:27043 tcp:27042
/android/sdk/platform-tools/adb shell "/data/local/tmp/frida-server"
