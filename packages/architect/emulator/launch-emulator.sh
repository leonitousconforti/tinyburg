#!/usr/bin/env bash
set -euo pipefail

rm -f /tmp/boot-completed
/android/sdk/platform-tools/adb start-server
/android/sdk/emulator/emulator -avd Pixel2 -no-window -gpu swiftshader_indirect -ports 5554,5555 -grpc 8554 -read-only -snapshot-list &
/android/sdk/platform-tools/adb wait-for-device
until /android/sdk/platform-tools/adb root; do echo "Failed to run adb root"; sleep 1s; done
/android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/
/android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"
/android/sdk/platform-tools/adb shell "/data/local/tmp/frida-server" &
/android/sdk/platform-tools/adb forward tcp:27043 tcp:27042
socat tcp-listen:27042,reuseaddr,fork tcp:127.0.0.1:27043 &
/usr/local/bin/envoy-1.27.0-linux-x86_64 -c /etc/envoy/envoy.yaml &
touch /tmp/boot-completed
sleep infinity
