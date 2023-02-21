#!/usr/bin/env bash

# Setup pulse audio
mkdir -p /root/.config/pulse
export PULSE_SERVER=unix:/tmp/pulse-socket
pulseaudio -D -vvvv --log-time=1 --log-target=newfile:/tmp/pulseverbose.log --log-time=1 --exit-idle-time=-1
tail -f /tmp/pulseverbose.log -n +1 | sed -u 's/^/pulse: /g' &
pactl list || exit 1

# Launch internal adb server, needed for our health check and configuring frida.
/android/sdk/platform-tools/adb start-server

# Start the emulator
/android/sdk/emulator/emulator -avd Pixel2 -no-window -ports 5554,5555 -grpc 8554 -skip-adb-auth -wipe-data -no-boot-anim -gpu swiftshader_indirect -qemu -append panic=1
