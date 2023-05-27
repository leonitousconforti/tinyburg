FROM envoyproxy/envoy:v1.26-latest
COPY ./envoy.yaml /etc/envoy/envoy.yaml
ADD ./jwt_secrets_pub.json /etc/jwt_secrets_pub.jwks
CMD /usr/local/bin/envoy -c /etc/envoy/envoy.yaml
