# docker build . -t tinyburg/architect:emulator-9322596_sysimg-31-google-apis-x64_frida-16.0.8
# docker run --device /dev/kvm --publish 5554:5554/tcp --publish 5555:5555/tcp --publish 8554:8554/tcp --publish 27042:27042/tcp -it tinyburg/architect:emulator-9322596_sysimg-31-google-apis-x64_frida-16.0.8

FROM alpine:latest as dependency-preparer
RUN apk add --update openssl wget unzip xz

WORKDIR /tmp
RUN wget https://dl.google.com/android/repository/emulator-linux_x64-9322596.zip && \
    wget https://dl.google.com/android/repository/platform-tools_r29.0.5-linux.zip && \
    wget https://dl.google.com/android/repository/sys-img/google_apis/x86_64-31_r11.zip && \
    wget https://github.com/frida/frida/releases/download/16.0.8/frida-server-16.0.8-android-x86_64.xz && \
    unzip -u -o x86_64-31_r11.zip -d sysimg && \
    unzip -u -o emulator-linux_x64-9322596.zip && \
    unzip -u -o platform-tools_r29.0.5-linux.zip && \
    xz --decompress frida-server-16.0.8-android-x86_64.xz && \
    rm -f x86_64-31_r11.zip && \
    rm -f emulator-linux_x64-9322596.zip && \
    rm -f platform-tools_r29.0.5-linux.zip && \
    rm -f frida-server-16.0.8-android-x86_64.xz

FROM nvidia/opengl:1.2-glvnd-runtime-ubuntu20.04
ENV NVIDIA_DRIVER_CAPABILITIES ${NVIDIA_DRIVER_CAPABILITIES},display

# Pulse audio is needed due to some webrtc dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Emulator & video bridge dependencies
    libc6 libdbus-1-3 libfontconfig1 libgcc1 \
    libpulse0 libtinfo5 libx11-6 libxcb1 libxdamage1 \
    libnss3 libxcomposite1 libxcursor1 libxi6 \
    libxext6 libxfixes3 zlib1g libgl1 pulseaudio socat \
    iputils-ping \
    # Enable turncfg through usage of curl
    curl ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV ANDROID_SDK_ROOT /android/sdk
ENV ANDROID_AVD_HOME /android/avd-home
RUN mkdir -p /android/apks && \
    mkdir -p /android/frida && \
    mkdir -p /android/avd-home && \
    mkdir -p /android/sdk/emulator/ && \
    mkdir -p /android/sdk/platforms/ && \
    mkdir -p /android/sdk/system-images && \
    mkdir -p /android/sdk/platform-tools

COPY --from=dependency-preparer /tmp/emulator/ /android/sdk/emulator/
COPY --from=dependency-preparer /tmp/platform-tools/ /android/sdk/platform-tools/
COPY --from=dependency-preparer /tmp/sysimg/ /android/sdk/system-images/android/default/
COPY --from=dependency-preparer /tmp/frida-server-16.0.8-android-x86_64 /android/frida/frida-server

COPY avd/ /android/avd-home
COPY launch-emulator.sh /android/sdk/
COPY default.pulse-audio /etc/pulse/default.pa
COPY TinyTowerApk.apk /android/apks/TinyTowerApk.apk

RUN gpasswd -a root audio && \
    chmod +x /android/sdk/platform-tools/adb && \
    chmod +x /android/sdk/launch-emulator.sh

EXPOSE 5554 5555 8554 27042
CMD ["/android/sdk/launch-emulator.sh"]

HEALTHCHECK --interval=30s \
    --timeout=30s \
    --start-period=30s \
    --retries=3 \
    CMD /android/sdk/platform-tools/adb shell getprop dev.bootcomplete | grep "1"

LABEL android-sdk.emulator.version="9322596" \
    android-sdk.platform-tools.version="29.0.5" \
    android-sdk.system-image.version="sys-31-google-apis-64" \
    frida-server.version="16.0.8-android-x86_64" \
    org.opencontainers.image.source="https://github.com/leonitousconforti/tinyburg" \
    org.opencontainers.image.description="Runs TinyTower on an android emulator in a docker image. Exposes the emulator console, adb, grpc, and frida server endpoints without any protections" \
    org.opencontainers.image.licenses="MIT"
