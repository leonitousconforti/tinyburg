FROM node:14-bullseye-slim
LABEL org.opencontainers.image.source https://github.com/leonitousconforti/tinyburg
ARG GIT_SHA=""

ENV GIT_SHA ${GIT_SHA}
ENV NODE_ENV="production"
WORKDIR /app
COPY . .
RUN yarn install && yarn build
EXPOSE 5000
CMD [ "node", "./dist/proxy.js" ]
