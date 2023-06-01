#!/usr/bin/env bash

set -e
pip3 install -r ./jwt-provider/requirements.txt
python3 ./jwt-provider/generate-passwords.py
cp ./jwt-provider/jwt_secrets_pub.json ./envoy/jwt_secrets_pub.json
