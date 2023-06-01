#!/usr/bin/env bash

pip3 install -r requirements.txt
python3 generate-passwords.py
mv jwt_secrets_pub.json ../envoy/jwt_secrets_pub.json
