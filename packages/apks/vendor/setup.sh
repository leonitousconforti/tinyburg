#!/usr/bin/env bash

wget -O apktool_2.7.0.jar https://github.com/iBotPeaches/Apktool/releases/download/v2.7.0/apktool_2.7.0.jar
wget -O uber-apk-signer-1.3.0.jar https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar

wget https://github.com/frida/frida/releases/download/16.1.0/frida-gadget-16.1.0-android-arm64.so.xz
wget https://github.com/frida/frida/releases/download/16.1.0/frida-gadget-16.1.0-android-x86_64.so.xz

unxz --force frida-gadget-16.1.0-android-arm64.so.xz
unxz --force frida-gadget-16.1.0-android-x86_64.so.xz
