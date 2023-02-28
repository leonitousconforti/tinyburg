#!/usr/bin/env python3


"""https://fadeevab.com/frida-gadget-injection-on-android-no-root-2-methods/#method-1-inject-a-libfrida-gadget-so-as-a-dependency-to-a-native-library-jni-inside-of-apk"""


import os
import re
import shutil
import subprocess
import sys
import tempfile

import lief

apktool_location = os.path.join(
    os.path.dirname(__file__), "..", "vendor", "apktool_2.7.0.jar"
)
uber_apk_signer_location = os.path.join(
    os.path.dirname(__file__), "..", "vendor", "uber-apk-signer-1.3.0.jar"
)
frida_gadget_location = os.path.join(
    os.path.dirname(__file__),
    "..",
    "vendor",
    "frida-gadget-16.0.10-android-arm64.so",
)


if len(sys.argv) is not 2:
    print("Must give location of apk to patch")
    exit(1)


# Do all our work in a temp folder
with tempfile.TemporaryDirectory() as temp_directory_name:
    print("created temporary directory created for patching", temp_directory_name)

    # apktool d -rs target.apk
    subprocess.run(
        [
            "java",
            "-jar",
            f"{apktool_location}",
            "d",
            "-f",
            "--no-res",
            "--no-src",
            "--output",
            f"{temp_directory_name}",
            f"{sys.argv[1]}",
        ],
        check=True,
    )

    # cp frida-gadget-12.8.8-android-arm64.so target/lib/arm64-v8a/libfrida-gadget.so
    shutil.copyfile(
        frida_gadget_location,
        os.path.join(temp_directory_name, "lib", "arm64-v8a", "libfrida-gadget.so"),
    )

    lib_main = os.path.join(temp_directory_name, "lib", "arm64-v8a", "libmain.so")
    native_library = lief.parse(lib_main)
    native_library.add_library("libfrida-gadget.so")
    native_library.write(lib_main)

    # readelf -d target/lib/arm64-v8a/libfromapk.so
    subprocess.run(["readelf", "-d", lib_main])

    # apktool b target
    apktool_output = os.path.join(temp_directory_name, "dist", "apktool_build.apk")
    subprocess.run(
        [
            "java",
            "-jar",
            f"{apktool_location}",
            "b",
            "--output",
            f"{apktool_output}",
            f"{temp_directory_name}",
        ],
        check=True,
    )

    # java -jar uber-apk-signer-1.1.0.jar -a target/dist/target.apk
    uber_apk_signer_output = os.path.join(
        temp_directory_name, "dist", "apktool_build-aligned-debugSigned.apk"
    )
    subprocess.run(
        [
            "java",
            "-jar",
            f"{uber_apk_signer_location}",
            "--apks",
            f"{apktool_output}",
        ],
        check=True,
    )

    # cp target/dist/apktool_build-aligned-debugSigned.apk ./finished.apk
    source_regex = re.compile(r"(apkpure|apkmirror)", re.RegexFlag.MULTILINE)
    version_regex = re.compile(r"([\d]+.[\d]+.[\d-]+)", re.RegexFlag.MULTILINE)
    source = re.search(source_regex, sys.argv[1])[1]
    version = re.search(version_regex, sys.argv[1])[1]
    output_file_name = f"{source}-{version}-with-frida-gadget"

    shutil.copyfile(
        uber_apk_signer_output,
        os.path.join(os.path.dirname(__file__), "patched", f"{output_file_name}.apk"),
    )
