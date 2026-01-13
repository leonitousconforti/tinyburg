export ANDROID_SDK="/Users/leo.conforti/Library/Android/sdk"

$ANDROID_SDK/emulator/emulator @Small_Phone -gpu swiftshader_indirect &
$ANDROID_SDK/platform-tools/adb root
$ANDROID_SDK/platform-tools/adb push /Users/leo.conforti/Downloads/frida-server-17.5.2-android-arm64 /data/local/tmp/
$ANDROID_SDK/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server-17.5.2-android-arm64"
$ANDROID_SDK/platform-tools/adb shell "/data/local/tmp/frida-server-17.5.2-android-arm64 &"
