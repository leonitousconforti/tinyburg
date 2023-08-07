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
/android/sdk/emulator/emulator -avd Pixel2 -no-window -ports 5554,5555 -grpc 8554 -gpu swiftshader_indirect -qemu -append panic=1
