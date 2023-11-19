#!/usr/bin/env bash
set -euo pipefail
rm -f /tmp/boot-completed

# Start pulse audio
export PULSE_SERVER=unix:/tmp/pulse-socket
pulseaudio -D --log-target=newfile:/tmp/pulseverbose.log --exit-idle-time=-1

# Start mitmproxy
/usr/local/bin/mitmweb --set listen_port=7999 --set web_host="0.0.0.0" --set web_port=8082 --set web_open_browser=false &
sleep 3s
hashed_name=`openssl x509 -inform PEM -subject_hash_old -in ~/.mitmproxy/mitmproxy-ca-cert.cer | head -1`
cp ~/.mitmproxy/mitmproxy-ca-cert.cer ~/.mitmproxy/$hashed_name.0

# Start adb and emulator
/android/sdk/platform-tools/adb start-server
/android/sdk/emulator/emulator -avd Pixel2 -gpu host -ports 5554,5555 -grpc 8554 -http-proxy "127.0.0.1:7999" -read-only -snapshot-list -debug-grpc &
/android/sdk/platform-tools/adb wait-for-device
until /android/sdk/platform-tools/adb root; do echo "Failed to run adb root"; sleep 1s; done

# Start frida server
until /android/sdk/platform-tools/adb push /android/frida/frida-server /data/local/tmp/; do echo "Failed to push frida server"; sleep 1s; done
until /android/sdk/platform-tools/adb shell "chmod 755 /data/local/tmp/frida-server"; do echo "Failed to make frida server executable"; sleep 1s; done
/android/sdk/platform-tools/adb shell "/data/local/tmp/frida-server" &
/android/sdk/platform-tools/adb forward tcp:27043 tcp:27042
socat tcp-listen:27042,reuseaddr,fork tcp:127.0.0.1:27043 &

# Finish setup mitm cert on android emulator
/android/sdk/platform-tools/adb push ~/.mitmproxy/$hashed_name.0 /data/misc/user/0/cacerts-added/$hashed_name.0
/android/sdk/platform-tools/adb shell "su 0 chmod 644 /data/misc/user/0/cacerts-added/$hashed_name.0"

# Start envoy proxy
/usr/local/bin/envoy -c /etc/envoy/envoy.yaml &

# Done!
touch /tmp/boot-completed
sleep infinity
