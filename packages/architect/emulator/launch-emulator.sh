#!/usr/bin/env bash

# Remove any previous lock files left over
rm -f /tmp/pulse-socket
rm -f /android/avd-home/Pixel2.avd/*.lock

# Setup pulse audio for the webrtc video bridge
mkdir -p /root/.config/pulse
export PULSE_SERVER=unix:/tmp/pulse-socket
pulseaudio -D --log-time=1 --log-target=newfile:/tmp/pulseverbose.log --log-time=1 --exit-idle-time=-1

# Make sure the config is in the right place
cp /android/avd-home/config.ini /android/avd-home/Pixel2.avd/config.ini

# Start the adb server and the emulator
/android/sdk/platform-tools/adb start-server
/android/sdk/emulator/emulator -avd Pixel2 -no-window -ports 5554,5555 -grpc 8554 -gpu swiftshader_indirect -qemu -append panic=1 &
/android/sdk/platform-tools/adb wait-for-device
while [ "`/android/sdk/platform-tools/adb shell getprop sys.boot_completed | tr -d '\r' `" != "1" ] ; do sleep 1; done
socat tcp-listen:27042,reuseaddr,fork tcp:127.0.0.1:27043 &

# Install frida server
sleep 2s
/android/sdk/platform-tools/adb root
sleep 2s
/android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/
sleep 2s
/android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"
sleep 2s
/android/sdk/platform-tools/adb forward tcp:27043 tcp:27042
sleep 2s
# https://github.com/frida/frida/issues/1879
/android/sdk/platform-tools/adb shell "setprop persist.device_config.runtime_native.usap_pool_enabled false"
sleep 2s
/android/sdk/platform-tools/adb shell "/data/local/tmp/frida-server"
