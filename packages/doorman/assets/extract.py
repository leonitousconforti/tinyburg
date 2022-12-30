#!/usr/bin/env python3

import os
import zipfile
import tempfile

import click

from UnityPy.enums.ClassIDType import ClassIDType
from UnityPy.tools.extractor import extract_assets

thisDirectory = os.path.dirname(__file__)
apksDirectoryDefault = os.path.join(thisDirectory, "..", "apks")


@click.command()
@click.option(
    "--apksdirectory",
    required=True,
    type=click.Path(exists=True, file_okay=False, dir_okay=True),
    default=apksDirectoryDefault,
    help="Where to find the apk files")
@click.option(
    "--outputdirectory",
    required=True,
    type=click.Path(exists=True, file_okay=False, dir_okay=True),
    default=thisDirectory,
    help="Output folder")
@click.option(
    "--TinyTowerVersion",
    type=click.STRING,
    prompt="What TinyTower version to extract from")
def extract(apksdirectory, outputdirectory, tinytowerversion):

    # Iterate over all files in the apks folder
    for root, _dirs, files in os.walk(apksdirectory):
        for file_name in files:

            # Check if this is the version we want
            if tinytowerversion not in file_name:
                continue

            # Generate file path
            file_path = os.path.join(root, file_name)

            # Generate and create the output folders
            outputFolder = os.path.join(outputdirectory, tinytowerversion)
            os.makedirs(outputFolder, exist_ok=True)

            # Open the file as a zip file object, it will
            # automatically be closed at the end of this context
            with zipfile.ZipFile(file_path, 'r') as zip_ref:

                # Create a temp directory on this system, it will
                # automatically be deleted at the end of this context
                with tempfile.TemporaryDirectory() as tempApkUnzipFolder:

                    # Extract the contents of the zip/apk into the temp dir
                    zip_ref.extractall(tempApkUnzipFolder)

                    # Extract assets from temp to output folder
                    extract_assets(
                        os.path.join(tempApkUnzipFolder,
                                     "assets", "bin", "Data"),
                        outputFolder,
                        use_container=False,
                        asset_filter=lambda asset:
                            asset.type is ClassIDType.Sprite or
                            asset.type is ClassIDType.Font or
                            asset.type is ClassIDType.TextAsset or
                            asset.type is ClassIDType.Texture2D
                    )


if __name__ == '__main__':
    extract()
