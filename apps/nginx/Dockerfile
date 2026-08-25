FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY apps/client/package*.json ./
RUN npm install

COPY apps/client/ .

ARG VITE_TOSS_CLIENT_KEY
ENV VITE_TOSS_CLIENT_KEY=$VITE_TOSS_CLIENT_KEY

RUN npm run build

FROM nginx:1.27-alpine

COPY apps/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
