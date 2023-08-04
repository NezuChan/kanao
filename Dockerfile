FROM ghcr.io/hazmi35/node:18-dev-alpine as build-stage

LABEL name "NezukoChan Gateway (Docker Build)"
LABEL maintainer "KagChi"

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

FROM ghcr.io/hazmi35/node:18-alpine

LABEL name "NezukoChan Gateway Production"
LABEL maintainer "KagChi"

COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/package-lock.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist
COPY --from=build-stage /tmp/build/entrypoint.sh /

ENTRYPOINT [ "/entrypoint.sh" ]
