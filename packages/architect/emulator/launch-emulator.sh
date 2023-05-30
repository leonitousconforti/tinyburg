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

# https://android.stackexchange.com/questions/83726/how-to-adb-wait-for-device-until-the-home-screen-shows-up
/android/sdk/platform-tools/adb wait-for-device
A=$(/android/sdk/platform-tools/adb shell getprop sys.boot_completed | tr -d '\r')
while [ "$A" != "1" ]; do
    sleep 2s
    A=$(/android/sdk/platform-tools/adb shell getprop sys.boot_completed | tr -d '\r')
done
sleep 30s

# Listeners, needed because adb does not bind to all interfaces
# so just forwarding the port through docker does not work
socat tcp-listen:27042,reuseaddr,fork tcp:127.0.0.1:27043 &

# Install frida server
/android/sdk/platform-tools/adb root
/android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/
/android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"
/android/sdk/platform-tools/adb forward tcp:27043 tcp:27042
/android/sdk/platform-tools/adb shell "/data/local/tmp/frida-server"
