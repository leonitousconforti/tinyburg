#!/usr/bin/env bash
set -euo pipefail

# Make sure the config is in the right place
cp /android/avd-home/config.ini /android/avd-home/Pixel2.avd/config.ini

# Start the adb server and the emulator
/android/sdk/platform-tools/adb start-server
/android/sdk/emulator/emulator -avd Pixel2 -no-window -gpu swiftshader_indirect -ports 5554,5555 -grpc 8554 -quit-after-boot 120
