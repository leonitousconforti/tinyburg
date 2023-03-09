#!/usr/bin/env python3

import json
import binascii
from jwcrypto import jwk
from werkzeug.security import generate_password_hash


unsalted_credentials = [("username", "password")]

credentials_file = open("credentials.json", "w")
public_keys_file = open("jwt_secrets_pub.json", "w")
private_keys_file = open("jwt_secrets_priv.json", "w")

# Create salted credentials
salted_credentials = {}
for pair in unsalted_credentials:
    salted_credentials[pair[0]] = generate_password_hash(pair[1])

# Create the jwks secrets and export them
keys = jwk.JWK.generate(kty="RSA", size=2048)
kid = hex(binascii.crc32(keys.export_public().encode("utf-8")) & 0xFFFFFFFF)
public = json.loads(keys.export_public())
private = json.loads(keys.export_private())
public["kid"] = kid
private["kid"] = kid

# Write everything to files
public_keys_file.write(json.dumps(public, indent=4))
private_keys_file.write(json.dumps(private, indent=4))
credentials_file.write(json.dumps(salted_credentials))

# Close files
credentials_file.close()
public_keys_file.close()
private_keys_file.close()
