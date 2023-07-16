#!/usr/bin/env python3

import os
import zipfile
import tempfile

import click

from UnityPy.enums.ClassIDType import ClassIDType
from UnityPy.tools.extractor import extract_assets


@click.command()
@click.option(
    "--apk",
    required=True,
    type=click.Path(exists=True, file_okay=True, dir_okay=False),
    help="Where to find the apk file",
)
@click.option(
    "--only_required",
    required=False,
    is_flag=True,
    default=False,
)
def extract(apk, only_required):
    # Open the file as a zip file object, it will
    # automatically be closed at the end of this context
    with zipfile.ZipFile(apk, "r") as zip_ref:
        # Create a temp directory on this system, it will
        # automatically be deleted at the end of this context
        with tempfile.TemporaryDirectory() as tempApkUnzipFolder:
            # Extract the contents of the zip/apk into the temp dir
            zip_ref.extractall(tempApkUnzipFolder)
            output_directory = os.path.join(os.path.dirname(__file__), "extracted")
            os.makedirs(output_directory, exist_ok=True)

            def asset_filter(asset):
                if only_required and asset.name is not None:
                    return asset.name == "game" or asset.name == "silkscreen"
                else:
                    return asset.type in [
                        ClassIDType.Sprite,
                        ClassIDType.Font,
                        ClassIDType.TextAsset,
                        ClassIDType.Texture2D,
                    ]

            # Extract assets from temp to output folder
            extract_assets(
                os.path.join(tempApkUnzipFolder, "assets", "bin", "Data"),
                os.path.join(output_directory),
                use_container=False,
                asset_filter=asset_filter,
            )


if __name__ == "__main__":
    extract()
