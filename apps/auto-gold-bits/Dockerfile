FROM alpine:latest as dependency-preparer
WORKDIR /workspace/tinyburg
ADD deploy.zip .
RUN unzip deploy.zip && rm deploy.zip

FROM node:18-slim
ENV NODE_ENV="production"
COPY --from=dependency-preparer /workspace/tinyburg /workspace/tinyburg
RUN node /workspace/tinyburg/create-links.js create
CMD ["node", "/workspace/tinyburg/apps/authproxy/dist/proxy.js"]

LABEL org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/leonitousconforti/tinyburg" \
    org.opencontainers.image.description="Auto gold bit farm"
