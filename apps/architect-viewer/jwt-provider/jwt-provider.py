import json
from datetime import datetime, timedelta

import jwt
from flask import Flask
from absl import app, flags, logging
from flask_httpauth import HTTPBasicAuth
from werkzeug.security import check_password_hash

FLAGS = flags.FLAGS

flags.DEFINE_string('passwd', 'passwd',
                    'The json password file used to verify access, generated by running gen-passwords.py')
flags.DEFINE_string('jwk', 'jwt_secrets_priv.jwks',
                    'The jwk webkey used for signing, generated by running gen-passwords.py')
flags.DEFINE_integer('port', 8080, 'The port where this service will run')


class MyHTTPBasicAuth(HTTPBasicAuth):
    """Let's prevent these annoying popups in the browser."""

    def authenticate_header(self):
        return 'Token realm="Token"'


api = Flask(__name__)
auth = MyHTTPBasicAuth()
private_key = {}

users = {}


@auth.verify_password
def verify_password(username, password):
    logging.info("user: %s - exists: %s", username, username in users)
    if username in users:
        return check_password_hash(users.get(username), password)
    return False


@api.route('/token', methods=['GET'])
@auth.login_required
def get_token():
    token = {
        # The KeyID, envoy will use this to pick the proper decryption key.
        'kid': private_key[0],
        # Both the 'iss' and 'aud' must match what is expected
        # in the envoy.yaml configuration
        # under "issuer" and "audiences", without it the token will be rejected.
        'iss': 'android-emulator@jwt-provider.py',
        'aud': 'android.emulation.control.EmulatorController',
        # we give users 2 hours of access.
        'exp': datetime.now() + timedelta(hours=2),
        'iat': datetime.now(),
        'name': auth.username()
    }
    return jwt.encode(token, private_key[1], algorithm='RS256')


def main(argv):
    if len(argv) > 1:
        raise app.UsageError('Too many command-line arguments.')

    global users
    global private_key

    with open(FLAGS.passwd) as f:
        users = json.load(f)

    logging.info('Loaded: %s', users.keys())

    # Note you really shouldn't have multiple keys in the jwks, as we will only use the last one.
    with open(FLAGS.jwk) as f:
        jwks = json.load(f)
        for key in jwks['keys']:
            private_key = (
                key['kid'], jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key)))

    api.run(host='0.0.0.0', port=FLAGS.port)


if __name__ == '__main__':
    app.run(main)
