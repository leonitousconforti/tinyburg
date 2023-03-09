#!/usr/bin/env python3


"""
This script patches an apk to add the frida gadget library, based on:
https://fadeevab.com/frida-gadget-injection-on-android-no-root-2-methods
"""


import os
import re
import shutil
import subprocess
import tempfile

import lief
import click


downloads_dir = os.path.dirname(__file__)
vendor_dir = os.path.join(downloads_dir, "..", "vendor")

apktool = os.path.join(vendor_dir, "apktool_2.7.0.jar")
uber_apk_signer = os.path.join(vendor_dir, "uber-apk-signer-1.3.0.jar")
frida_gadget_arm64 = os.path.join(vendor_dir, "frida-gadget-16.0.10-android-arm64.so")
frida_gadget_x86_64 = os.path.join(vendor_dir, "frida-gadget-16.0.10-android-x86_64.so")


@click.command()
@click.argument("apk-location", type=click.Path(exists=True, dir_okay=False))
@click.argument("frida-gadget-location", type=click.Path(exists=True, dir_okay=False))
@click.argument("gadget-config-location", type=click.Path(exists=True, dir_okay=False))
@click.option(
    "--lib-architecture",
    required=True,
    type=click.Choice(["arm64-v8a", "x86_64"]),
    help="Which architecture folder in the apk to place the gadget in",
)
def patch_apk_with_frida_gadget(
    apk_location,
    frida_gadget_location,
    gadget_config_location,
    lib_architecture,
):
    version_regex = re.compile(r"(\d+.\d+.\d+)", re.RegexFlag.MULTILINE)
    source_regex = re.compile(r"(apkpure|apkmirror)", re.RegexFlag.MULTILINE)
    gadget_mode_regex = re.compile(r"(listen|portal)", re.RegexFlag.MULTILINE)

    source = re.search(source_regex, apk_location)[1]
    version = re.search(version_regex, apk_location)[1]
    gadget_mode = re.search(gadget_mode_regex, gadget_config_location)[1]
    output_file_name = (
        f"{source}-{version}-with-{lib_architecture}-frida-{gadget_mode}-gadget"
    )

    with tempfile.TemporaryDirectory() as temp_directory:
        # apktool d -rs target.apk
        subprocess.run(
            [
                "java",
                "-jar",
                f"{apktool}",
                "d",
                "-f",
                "--no-res",
                "--no-src",
                "--output",
                f"{temp_directory}",
                apk_location,
            ],
            check=True,
        )

        # cp frida-gadget-12.8.8-android-arm64.so target/lib/arm64-v8a/libfrida-gadget.so
        apk_native_lib_directory = os.path.join(temp_directory, "lib", lib_architecture)
        shutil.copyfile(
            frida_gadget_location,
            os.path.join(apk_native_lib_directory, "libfrida-gadget.so"),
        )
        shutil.copyfile(
            gadget_config_location,
            os.path.join(apk_native_lib_directory, "libfrida-gadget.config.so"),
        )

        # Inject frida gadget library
        lib_main = os.path.join(temp_directory, "lib", "arm64-v8a", "libmain.so")
        native_library = lief.parse(lib_main)
        native_library.add_library("libfrida-gadget.so")
        native_library.write(lib_main)

        # readelf -d target/lib/arm64-v8a/libfromapk.so
        subprocess.run(
            [
                "readelf",
                "-d",
                lib_main,
            ],
            check=True,
        )

        # apktool b target
        apktool_output = os.path.join(temp_directory, "dist", "apktool_build.apk")
        subprocess.run(
            [
                "java",
                "-jar",
                f"{apktool}",
                "b",
                "--output",
                f"{apktool_output}",
                f"{temp_directory}",
            ],
            check=True,
        )

        # java -jar uber-apk-signer-1.1.0.jar -a target/dist/target.apk
        uber_apk_signer_output = os.path.join(
            temp_directory, "dist", "apktool_build-aligned-debugSigned.apk"
        )
        subprocess.run(
            [
                "java",
                "-jar",
                f"{uber_apk_signer}",
                "--apks",
                f"{apktool_output}",
            ],
            check=True,
        )

        # cp target/dist/apktool_build-aligned-debugSigned.apk ./finished.apk
        shutil.copyfile(
            uber_apk_signer_output,
            os.path.join(downloads_dir, "patched", f"{output_file_name}.apk"),
        )


if __name__ == "__main__":
    patch_apk_with_frida_gadget()
