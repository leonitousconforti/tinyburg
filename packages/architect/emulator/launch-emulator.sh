#!/usr/bin/env bash

# Remove any previous lock files left over
rm -f /tmp/pulse-socket
rm -f /android/avd-home/Pixel2.avd/*.lock

# Setup pulse audio for the webrtc video bridge
mkdir -p /root/.config/pulse
export PULSE_SERVER=unix:/tmp/pulse-socket
pulseaudio -D --log-time=1 --log-target=newfile:/tmp/pulseverbose.log --log-time=1 --exit-idle-time=-1

# Start the adb server and the emulator
/android/sdk/platform-tools/adb start-server
/android/sdk/emulator/emulator -avd Pixel2 -no-window -ports 5554,5555 -grpc 8554 -gpu swiftshader_indirect -qemu -append panic=1 &
/android/sdk/platform-tools/adb wait-for-device
while [ "`/android/sdk/platform-tools/adb shell getprop sys.boot_completed | tr -d '\r' `" != "1" ] ; do sleep 1; done
sleep 10s

# Listeners, needed because adb does not bind to all interfaces
# so just forwarding the port through docker does not work
socat tcp-listen:27042,reuseaddr,fork tcp:127.0.0.1:27043 &

# Install frida server
/android/sdk/platform-tools/adb root
/android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/
/android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"
/android/sdk/platform-tools/adb forward tcp:27043 tcp:27042
/android/sdk/platform-tools/adb shell "/data/local/tmp/frida-server"
sleep 10s
