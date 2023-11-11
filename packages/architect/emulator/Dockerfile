FROM alpine:latest as dependency-preparer
RUN apk add --update openssl wget unzip xz tar

ARG EMULATOR_VERSION
ARG MITM_PROXY_VERSION
ARG ENVOY_PROXY_VERSION
ARG FRIDA_SERVER_VERSION
ARG ANDROID_SDK_TOOLS_VERSION
ARG EMULATOR_SYSTEM_IMAGE_VERSION
ARG EMULATOR_SYSTEM_IMAGE_VERSION_SHORT

WORKDIR /tmp
RUN wget "https://dl.google.com/android/repository/emulator-linux_x64-${EMULATOR_VERSION}.zip" && \
    wget "https://dl.google.com/android/repository/sys-img/${EMULATOR_SYSTEM_IMAGE_VERSION}.zip" && \
    wget "https://dl.google.com/android/repository/platform-tools_r${ANDROID_SDK_TOOLS_VERSION}-linux.zip" && \
    wget "https://downloads.mitmproxy.org/${MITM_PROXY_VERSION}/mitmproxy-${MITM_PROXY_VERSION}-linux.tar.gz" && \
    wget "https://github.com/envoyproxy/envoy/releases/download/v${ENVOY_PROXY_VERSION}/envoy-${ENVOY_PROXY_VERSION}-linux-x86_64" && \
    wget "https://github.com/frida/frida/releases/download/${FRIDA_SERVER_VERSION}/frida-server-${FRIDA_SERVER_VERSION}-android-x86_64.xz" && \
    tar -xzf "mitmproxy-${MITM_PROXY_VERSION}-linux.tar.gz" && \
    unzip -u -o "emulator-linux_x64-${EMULATOR_VERSION}.zip" && \
    unzip -u -o "platform-tools_r${ANDROID_SDK_TOOLS_VERSION}-linux.zip" && \
    unzip -u -o "${EMULATOR_SYSTEM_IMAGE_VERSION_SHORT}" -d sysimg && \
    xz --decompress "frida-server-${FRIDA_SERVER_VERSION}-android-x86_64.xz" && \
    rm -f "${EMULATOR_SYSTEM_IMAGE_VERSION_SHORT}" && \
    rm -f "emulator-linux_x64-${EMULATOR_VERSION}.zip" && \
    rm -f "mitmproxy-${MITM_PROXY_VERSION}-linux.tar.gz" && \
    rm -f "platform-tools_r${ANDROID_SDK_TOOLS_VERSION}-linux.zip" && \
    rm -f "frida-server-${FRIDA_SERVER_VERSION}-android-x86_64.xz"

FROM nvidia/opengl:1.2-glvnd-runtime-ubuntu22.04

ARG MITM_PROXY_VERSION
ARG ENVOY_PROXY_VERSION
ARG FRIDA_SERVER_VERSION
ENV ANDROID_SDK_ROOT=/android/sdk
ENV ANDROID_AVD_HOME=/android/avd-home
ENV NVIDIA_DRIVER_CAPABILITIES=${NVIDIA_DRIVER_CAPABILITIES},display

RUN mkdir -p "/android/apks/" && \
    mkdir -p "/android/frida/" && \
    mkdir -p "/android/avd-home/" && \
    mkdir -p "/android/sdk/emulator/" && \
    mkdir -p "/android/sdk/platforms/" && \
    mkdir -p "/android/sdk/system-images/" && \
    mkdir -p "/android/sdk/platform-tools/"

COPY --from=dependency-preparer "/tmp/mitmweb" "/usr/local/bin/mitmweb"
COPY --from=dependency-preparer "/tmp/mitmdump" "/usr/local/bin/mitmdump"
COPY --from=dependency-preparer "/tmp/mitmproxy" "/usr/local/bin/mitmproxy"
COPY --from=dependency-preparer "/tmp/emulator/" "/android/sdk/emulator/"
COPY --from=dependency-preparer "/tmp/platform-tools/" "/android/sdk/platform-tools/"
COPY --from=dependency-preparer "/tmp/sysimg/" "/android/sdk/system-images/android/default/"
COPY --from=dependency-preparer "/tmp/envoy-${ENVOY_PROXY_VERSION}-linux-x86_64" "/usr/local/bin/envoy"
COPY --from=dependency-preparer "/tmp/frida-server-${FRIDA_SERVER_VERSION}-android-x86_64" "/android/frida/frida-server"

# TODO: Reduce this to only exactly what needs to be installed
RUN apt-get update && \
    # spell-checker: disable-next-line
    apt-get install -yq --no-install-recommends libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 libnss3 pulseaudio libpulse0 libtinfo5

ADD avd/ /android/avd-home
COPY entrypoint.sh /android/sdk/
COPY make-snapshot.sh /android/sdk/
COPY nginx.conf /etc/nginx/nginx.conf
COPY envoy.yaml /etc/envoy/envoy.yaml
COPY default.pulse-audio /etc/pulse/default.pa
COPY emulator_access.json /android/sdk/emulator/lib/emulator_access.json

RUN gpasswd -a root audio && \
    chmod +x /usr/local/bin/envoy && \
    chmod +x /usr/local/bin/mitmweb && \
    chmod +x /usr/local/bin/mitmdump && \
    chmod +x /usr/local/bin/mitmproxy && \
    chmod +x /android/sdk/entrypoint.sh && \
    chmod +x /android/sdk/make-snapshot.sh && \
    chmod +x /android/sdk/platform-tools/adb && \
    apt-get update && \
    apt-get install -y --no-install-recommends socat tzdata openssl nginx && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

EXPOSE 5554 5555 8080 8081 8554 8555 27042
CMD ["/android/sdk/entrypoint.sh"]

HEALTHCHECK --interval=1s \
    --timeout=3s \
    --retries=90 \
    CMD bash -c "[ -f /tmp/boot-completed ]"

LABEL org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/leonitousconforti/tinyburg" \
    org.opencontainers.image.description="Runs TinyTower on an android emulator in a docker image. Exposes the emulator console, adb, grpc, and frida server endpoints without any protections"
