<div align="center">

<img src="https://i.kagchi.my.id/nezuko.png" alt="Logo" width="200px" height="200px" style="border-radius:50%"/>

# @nezuchan/nezu-gateway

**A standalone service for connecting to the Discord gateway.**

[![GitHub](https://img.shields.io/github/license/nezuchan/nezu-gateway)](https://github.com/nezuchan/nezu-gateway/blob/main/LICENSE)
[![Discord](https://discordapp.com/api/guilds/785715968608567297/embed.png)](https://nezu.my.id)

</div>

# Requirements
- NodeJS 16+

# Features
- Zero downtime deployments, You will almost never need to restart the gateway service, allowing absolute 100% uptime for your bot. Even when a restart is required, nezu-gateway will resume the sessions, so you will not lose a single event.
- Automatic re-sharding
- Large treshold support
- Redis cluster support
- Docker replica

# Docker Replica

To deploy replica the container must connected to docker sock in order know which replica in they are
```yaml
version: '3.8'

services:
  nezu-gateway:
    deploy:
      resources:
        limits:
          memory: "256M"
      replicas: ${GATEWAY_REPLICA_COUNT:-3}
    restart: always
    image: 'ghcr.io/nezuchan/nezu-gateway:latest'
    env_file:
      - .env
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

Being used in production by NezukoChan, Musical Tune, and more.
