FROM node:16-alpine

WORKDIR /app
COPY ./build ./build
COPY ./public ./public

EXPOSE 8080
ENV NODE_ENV production
RUN npm install webpack webpack-cli webpack-dev-server
CMD ["npx", "webpack", "serve"]
