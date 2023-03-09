#!/usr/bin/env bash

# Setup pulse audio
mkdir -p /root/.config/pulse
export PULSE_SERVER=unix:/tmp/pulse-socket
pulseaudio -D -vvvv --log-time=1 --log-target=newfile:/tmp/pulseverbose.log --log-time=1 --exit-idle-time=-1
tail -f /tmp/pulseverbose.log -n +1 | sed -u 's/^/pulse: /g' &
pactl list || exit 1

# https://stackoverflow.com/questions/56130335/adb-port-forwarding-to-listen-on-all-interfaces
/android/sdk/platform-tools/adb kill-server
/android/sdk/platform-tools/adb -a nodaemon server start &

# Start the emulator
/android/sdk/emulator/emulator -avd Pixel2 -no-window -ports 5554,5555 -grpc 8554 -skip-adb-auth -wipe-data -no-boot-anim -gpu swiftshader_indirect -turncfg 'printf {"iceServers":[{"urls":["stun:stun.l.google.com:19302"]}]}' -qemu -append panic=1 &

# https://android.stackexchange.com/questions/83726/how-to-adb-wait-for-device-until-the-home-screen-shows-up
/android/sdk/platform-tools/adb wait-for-device
A=$(/android/sdk/platform-tools/adb shell getprop sys.boot_completed | tr -d '\r')
while [ "$A" != "1" ]; do
    sleep 2
    A=$(/android/sdk/platform-tools/adb shell getprop sys.boot_completed | tr -d '\r')
done

# Install frida server
/android/sdk/platform-tools/adb root
/android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/
/android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"
/android/sdk/platform-tools/adb -a forward tcp:27042 tcp:27042
/android/sdk/platform-tools/adb shell "/data/local/tmp/frida-server"
