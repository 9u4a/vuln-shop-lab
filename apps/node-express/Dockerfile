FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY seed-images ./seed-images

ENV PORT=3000
EXPOSE 3000

VOLUME ["/app/data", "/app/uploads"]

CMD ["node", "src/server.js"]
