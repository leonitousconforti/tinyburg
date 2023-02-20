FROM node:16-alpine
WORKDIR /app
COPY ./build ./build
ENV NODE_ENV production
EXPOSE 8080
CMD ["npx", "serve", "build", "--listen", "8080"]
