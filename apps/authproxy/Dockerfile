FROM node:14-bullseye-slim
LABEL org.opencontainers.image.source https://github.com/leonitousconforti/tinyburg
ARG GIT_SHA=""

ENV GIT_SHA ${GIT_SHA}
ENV NODE_ENV="production"
WORKDIR /app
COPY . .
RUN yarn install && yarn build
EXPOSE 5000

# This command saves ~100MB of ram over 'yarn start' which is quite significant when the DigitalOcean
# droplet only has 1GB. This reduces the authproxy memory footprint from 180MB to just 90MB
CMD [ "node", "-r",  "./.pnp.cjs", "./dist/proxy.js" ]
