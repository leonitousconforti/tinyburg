FROM node:16-alpine

WORKDIR /app
COPY ./build ./build
COPY ./public ./public

EXPOSE 8080
ENV NODE_ENV production
CMD ["npx", "serve", "build", "--listen", "8080"]
