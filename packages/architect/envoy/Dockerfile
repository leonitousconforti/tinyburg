FROM envoyproxy/envoy:v1.22-latest
COPY ./envoy.yaml /etc/envoy/envoy.yaml
ADD ./jwt_secrets_pub.jwks /etc/jwt_secrets_pub.jwks
CMD /usr/local/bin/envoy -c /etc/envoy/envoy.yaml
