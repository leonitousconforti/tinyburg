FROM node:14-bullseye-slim

ARG GIT_SHA=""
ENV GIT_SHA ${GIT_SHA}
ENV NODE_ENV="production"

WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5000

CMD [ "node", "./dist/proxy.js" ]
