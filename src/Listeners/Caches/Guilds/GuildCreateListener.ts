import { Buffer } from "node:buffer";
import { RabbitMQ } from "@nezuchan/constants";
import { RoutingKey } from "@nezuchan/utilities";
import type { GatewayGuildCreateDispatch } from "discord-api-types/v10";
import { GatewayDispatchEvents } from "discord-api-types/v10";
import { channels, guilds, guildsChannels, memberRoles, members, roles, users, voiceStates } from "../../../Schema/index.js";
import type { ListenerContext } from "../../../Stores/Listener.js";
import { Listener } from "../../../Stores/Listener.js";
import { clientId, stateChannels, stateMembers, stateRoles, stateUsers, stateVoices } from "../../../config.js";

export class GuildCreateListener extends Listener {
    public constructor(context: ListenerContext) {
        super(context, {
            event: GatewayDispatchEvents.GuildCreate
        });
    }

    public async run(payload: { data: GatewayGuildCreateDispatch; shardId: number; }): Promise<void> {
        if (payload.data.d.unavailable !== undefined && payload.data.d.unavailable) return;

        await this.store.drizzle.insert(guilds).values({
            id: payload.data.d.id,
            unavailable: payload.data.d.unavailable,
            name: payload.data.d.name,
            banner: payload.data.d.banner,
            owner: payload.data.d.owner,
            ownerId: payload.data.d.owner_id
        }).onConflictDoUpdate({
            target: guilds.id,
            set: {
                unavailable: payload.data.d.unavailable,
                name: payload.data.d.name,
                banner: payload.data.d.banner,
                owner: payload.data.d.owner,
                ownerId: payload.data.d.owner_id
            }
        });

        if (stateRoles) {
            for (const role of payload.data.d.roles) {
                await this.store.drizzle.insert(roles).values({
                    id: role.id,
                    name: role.name,
                    permissions: role.permissions,
                    position: role.position,
                    color: role.color
                }).onConflictDoUpdate({
                    target: roles.id,
                    set: {
                        name: role.name,
                        permissions: role.permissions,
                        position: role.position,
                        color: role.color
                    }
                });
            }
        }

        for (const member of payload.data.d.members) {
            if (stateUsers) {
                await this.store.drizzle.insert(users).values({
                    id: member.user!.id,
                    username: member.user!.username,
                    discriminator: member.user?.discriminator ?? null,
                    globalName: member.user?.global_name ?? null,
                    avatar: member.user?.avatar ?? null,
                    bot: member.user?.bot ?? false,
                    flags: member.user?.flags
                }).onConflictDoUpdate({
                    target: users.id,
                    set: {
                        username: member.user!.username,
                        discriminator: member.user?.discriminator ?? null,
                        globalName: member.user?.global_name ?? null,
                        avatar: member.user?.avatar ?? null,
                        bot: member.user?.bot ?? false,
                        flags: member.user?.flags
                    }
                });
            }

            if (stateMembers) {
                await this.store.drizzle.insert(members).values({
                    id: member.user!.id,
                    avatar: member.avatar,
                    flags: member.flags
                }).onConflictDoUpdate({
                    target: members.id,
                    set: {
                        avatar: member.avatar,
                        flags: member.flags
                    }
                });

                for (const role of member.roles) {
                    await this.store.drizzle.insert(memberRoles).values({
                        id: member.user!.id,
                        roleId: role
                    }).onConflictDoNothing({ target: memberRoles.id });
                }
            }
        }

        if (stateChannels) {
            for (const channel of payload.data.d.channels) {
                await this.store.drizzle.insert(channels).values({
                    id: channel.id
                }).onConflictDoNothing({ target: members.id });

                await this.store.drizzle.insert(guildsChannels).values({
                    id: channel.id,
                    guildId: payload.data.d.id
                }).onConflictDoNothing({ target: guildsChannels.id });
            }
        }

        if (stateVoices) {
            for (const voice of payload.data.d.voice_states) {
                if (voice.channel_id !== null) {
                    await this.store.drizzle.insert(voiceStates).values({
                        channelId: voice.channel_id,
                        guildId: payload.data.d.id,
                        sessionId: voice.session_id,
                        memberId: voice.user_id
                    }).onConflictDoUpdate({ target: voiceStates.channelId, set: { sessionId: voice.session_id } });
                }
            }
        }

        // Does even someone used them?

        // if (stateEmojis) {
        //     for (const emoji of payload.data.d.emojis) {
        //         if (emoji.id !== null) {
        //             await this.store.redis.set(GenKey(RedisKey.EMOJI_KEY, emoji.id, payload.data.d.id), JSON.stringify(emoji));
        //         }
        //     }
        // }

        // if (statePresences) {
        //     for (const presence of payload.data.d.presences) {
        //         await this.store.redis.set(GenKey(RedisKey.PRESENCE_KEY, presence.user.id, payload.data.d.id), JSON.stringify(presence));
        //     }
        // }

        await this.store.amqp.publish(RabbitMQ.GATEWAY_QUEUE_SEND, RoutingKey(clientId, payload.shardId), Buffer.from(JSON.stringify(payload.data)));
    }
}
