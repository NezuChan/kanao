# Copyright 2023 Hazmi35 (https://github.com/Hazmi35)
FROM ghcr.io/hazmi35/node:20-dev-alpine as dev

# Prepare with corepack (experimental feature)
RUN corepack enable

# Prepare
FROM dev as prepare

ARG SCOPE
WORKDIR /prepare

# Scoped install for monorepo
RUN pnpm setup && pnpm add --global turbo
COPY . .
RUN turbo prune --scope=${SCOPE} --docker
RUN cp -r tsconfig* /prepare/out/json

# Build the project
FROM dev AS builder

WORKDIR /builder

# Set NPM_CONFIG_USERCONFIG build args
ARG SCOPE

# First install the dependencies (as they change less often)
COPY --from=prepare /prepare/out/json/ .
COPY --from=prepare /prepare/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=prepare /prepare/out/full/ .
RUN pnpm run build

# Deploy the service
RUN pnpm deploy -P --filter=${SCOPE} /out

# Get ready for production
FROM ghcr.io/hazmi35/node:20-alpine

LABEL name "${SCOPE}"

# Copy needed files
COPY --from=builder /out/package.json .
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/dist ./dist

# Start the app with node
CMD ["npm", "start"]