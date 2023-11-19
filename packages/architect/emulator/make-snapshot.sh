#!/usr/bin/env bash
set -euo pipefail

# Make sure the emulator config is in the right place
mkdir -p $ANDROID_AVD_HOME/Pixel2.avd/
cp $ANDROID_AVD_HOME/config.ini $ANDROID_AVD_HOME/Pixel2.avd/config.ini

# Start the adb server and the emulator
/android/sdk/platform-tools/adb start-server
/android/sdk/emulator/emulator -avd Pixel2 -gpu host -ports 5554,5555 -grpc 8554 -quit-after-boot 120
