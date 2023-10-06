FROM alpine:latest as dependency-preparer
WORKDIR /workspace/tinyburg
COPY common/deploy/authproxy.zip authproxy.zip
RUN unzip authproxy.zip && rm authproxy.zip

FROM node:18-slim
ARG GIT_SHA=""
ENV GIT_SHA ${GIT_SHA}
ENV NODE_ENV="production"
COPY --from=dependency-preparer /workspace/tinyburg /workspace/tinyburg
RUN node /workspace/tinyburg/create-links.js create
EXPOSE 5000
CMD ["node", "/workspace/tinyburg/apps/authproxy/dist/proxy.js"]

LABEL org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/leonitousconforti/tinyburg" \
    org.opencontainers.image.description="Auth server for the tinyburg library"
