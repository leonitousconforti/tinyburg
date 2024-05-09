FROM alpine:latest as dependency-preparer
WORKDIR /workspace/tinyburg
COPY common/deploy/archive.zip archive.zip
RUN unzip archive.zip && rm archive.zip

FROM node:20-slim
ENV NODE_ENV="production"
COPY --from=dependency-preparer /workspace/tinyburg /workspace/tinyburg
RUN node /workspace/tinyburg/create-links.js create
CMD ["node", "/workspace/tinyburg/apps/archive/index.js"]

LABEL org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/leonitousconforti/tinyburg" \
    org.opencontainers.image.description="Apk archivist"
