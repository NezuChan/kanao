FROM node:16-alpine3.14 as build-stage

LABEL name "NezukoChan Gateway (Docker Build)"
LABEL maintainer "KagChi"

WORKDIR /tmp/build

RUN apk add --no-cache build-base git python3

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

RUN git submodule update --force --recursive --init --remote

FROM node:16-alpine3.14

LABEL name "NezukoChan Gateway Production"
LABEL maintainer "KagChi"

WORKDIR /app

RUN apk add --no-cache tzdata git

COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/package-lock.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist

VOLUME [ "/app/logs" ]

CMD node --experimental-specifier-resolution=node -r dotenv/config dist/index.js