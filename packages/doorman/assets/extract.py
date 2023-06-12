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
def extract(apk):
    # Open the file as a zip file object, it will
    # automatically be closed at the end of this context
    with zipfile.ZipFile(apk, "r") as zip_ref:
        # Create a temp directory on this system, it will
        # automatically be deleted at the end of this context
        with tempfile.TemporaryDirectory() as tempApkUnzipFolder:
            # Extract the contents of the zip/apk into the temp dir
            zip_ref.extractall(tempApkUnzipFolder)

            # Extract assets from temp to output folder
            extract_assets(
                os.path.join(tempApkUnzipFolder, "assets", "bin", "Data"),
                os.path.join(os.path.dirname(__file__), "extracted"),
                use_container=False,
                asset_filter=lambda asset: asset.type is ClassIDType.Sprite
                or asset.type is ClassIDType.Font
                or asset.type is ClassIDType.TextAsset
                or asset.type is ClassIDType.Texture2D,
            )


if __name__ == "__main__":
    extract()
