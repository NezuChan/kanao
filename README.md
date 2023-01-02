<div align="center">

<img src="https://i.kagchi.my.id/nezuko.png" alt="Logo" width="200px" height="200px" style="border-radius:50%"/>

# @nezuchan/nezu-gateway

**A standalone service for connecting to the Discord gateway.**

[![GitHub](https://img.shields.io/github/license/nezuchan/nezu-gateway)](https://github.com/nezuchan/nezu-gateway/blob/main/LICENSE)
[![Discord](https://discordapp.com/api/guilds/785715968608567297/embed.png)](https://nezu.my.id)

</div>

# Requirements
- NodeJS 16+
- Scheduled Taks [here](https://github.com/NezuChan/scheduled-tasks)

# Features
- Zero downtime deployments, You will almost never need to restart the gateway service, allowing absolute 100% uptime for your bot. Even when a restart is required, nezu-gateway will resume the sessions, so you will not lose a single event.
- Automatic re-sharding
- Large treshold support
- Redis cluster support

# Information
- Routing mode, everything in saved on redis will be prefixed with {clientId}:{key}