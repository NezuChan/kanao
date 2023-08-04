FROM ghcr.io/hazmi35/node:18-dev-alpine as build-stage

LABEL name "NezukoChan Gateway (Docker Build)"
LABEL maintainer "KagChi"

RUN apk add --no-cache curl jq \
    && cd /usr/local/bin \
    && wget https://gist.githubusercontent.com/Hazmi35/58bdaa315c2521589c148bc393d59064/raw/6df5f424769d9aa9dde39938d2791840cc4807ca/gh-release-download.sh \
    && chmod +x gh-release-download.sh

RUN gh-release-download.sh mikefarah/yq latest yq_linux_amd64

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

FROM ghcr.io/hazmi35/node:18-alpine

LABEL name "NezukoChan Gateway Production"
LABEL maintainer "KagChi"

COPY --from=build-stage --chmod=755 /tmp/build/yq_linux_amd64 /usr/local/bin/yq
COPY --from=build-stage /tmp/build/package.json .
COPY --from=build-stage /tmp/build/package-lock.json .
COPY --from=build-stage /tmp/build/node_modules ./node_modules
COPY --from=build-stage /tmp/build/dist ./dist
COPY --from=build-stage /tmp/build/entrypoint.sh /

RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
