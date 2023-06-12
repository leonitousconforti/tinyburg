FROM alpine:latest as dependency-preparer
WORKDIR /workspace/tinyburg
ADD deploy.zip .
RUN unzip deploy.zip && rm deploy.zip

FROM node:18-slim
ARG GIT_SHA=""
ENV GIT_SHA ${GIT_SHA}
ENV NODE_ENV="production"
COPY --from=dependency-preparer /workspace/tinyburg /workspace/tinyburg
RUN node /workspace/tinyburg/create-links.js create
EXPOSE 5000
CMD ["node", "/workspace/tinyburg/apps/authproxy/dist/proxy.js"]
