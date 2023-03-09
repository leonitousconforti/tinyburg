#!/usr/bin/env python3

import jwt
import json
from flask import Flask
from datetime import datetime, timedelta
from flask_httpauth import HTTPBasicAuth
from werkzeug.security import check_password_hash


# Prevent annoying popups in the browser
class MyHTTPBasicAuth(HTTPBasicAuth):
    def authenticate_header(self):
        return 'Token realm="Token"'


# Loads the usernames+passwords and jwt secrets from filesystem
def get_user_credentials_and_jwt_secrets():
    credentials_file = open("credentials.json")
    private_key_file = open("jwt_secrets_priv.json")

    credentials = json.load(credentials_file)
    private_key_json = json.load(private_key_file)
    private_key = (
        private_key_json["kid"],
        jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(private_key_json)),
    )

    credentials_file.close()
    private_key_file.close()
    return (credentials, private_key)


api = Flask(__name__)
auth = MyHTTPBasicAuth()
credentials, private_key = get_user_credentials_and_jwt_secrets()


@auth.verify_password
def verify_password(username, password):
    if username in credentials:
        return check_password_hash(credentials.get(username), password)
    return False


@api.route("/token", methods=["GET"])
@auth.login_required
def get_token():
    token = {
        "kid": private_key[0],
        "name": auth.username(),
        "iss": "android-emulator@jwt-provider.py",
        "aud": "android.emulation.control.EmulatorController",
        "iat": datetime.now(),
        "exp": datetime.now() + timedelta(hours=2),
    }
    return jwt.encode(token, private_key[1], algorithm="RS256")


api.run(host="0.0.0.0", port=8080)
