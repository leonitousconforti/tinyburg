#!/usr/bin/env bash

set -euo pipefail

# Remove old files
rm -f android-grpc.tar.gz
rm -f emulator_controller.proto

# Download new files
wget https://android.googlesource.com/platform/external/qemu/+archive/refs/heads/emu-master-dev/android/android-grpc.tar.gz
tar -zxf android-grpc.tar.gz emulator_controller.proto
