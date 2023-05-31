#!/usr/bin/env bash

# Pulling data from the emulator allows it to start faster on subsequent runs.
# docker build ./emulator -t tinyburg/architect:emulator-10086546_sys-30-google-apis-x64-r12_frida-16.0.19
# docker run --device /dev/kvm -it tinyburg/architect:emulator-10086546_sys-30-google-apis-x64-r12_frida-16.0.19 /android/sdk/pull-data.sh
# docker ps -a
# docker cp --archive container_id:/android/avd-home/Pixel2.avd emulator/avd/
# docker rm container_id
# docker build ./emulator -t tinyburg/architect:emulator-10086546_sys-30-google-apis-x64-r12_frida-16.0.19

# Start the adb server and the emulator
/android/sdk/platform-tools/adb start-server
/android/sdk/emulator/emulator -avd Pixel2 -quit-after-boot 300 -no-window -ports 5554,5555 -grpc 8554 -gpu swiftshader_indirect -qemu -append panic=1
