import { channelsOverwrite } from "@nezuchan/kanao-schema";
import type { channels } from "@nezuchan/kanao-schema";
import type { ChannelFlags, RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { Base } from "../Base.js";
import type { Guild } from "../Guild.js";
import type { GuildMember } from "../GuildMember.js";
import type { Message } from "../Message.js";
import { PermissionsBitField } from "../PermissionsBitField.js";
import type { TextChannel } from "./TextChannel.js";
import type { VoiceChannel } from "./VoiceChannel.js";

export class BaseChannel extends Base<Partial<InferSelectModel<typeof channels>>> {
    public get guildId(): string | null | undefined {
        return this.data.guildId;
    }

    public get name(): string | null | undefined {
        return this.data.name;
    }

    public get type(): ChannelType {
        return this.data.type!;
    }

    public get flags(): ChannelFlags | null | undefined {
        return this.data.flags;
    }

    public get position(): number | null | undefined {
        return this.data.position;
    }

    public get parentId(): string | null | undefined {
        return this.data.parentId;
    }

    public async send(options: RESTPostAPIChannelMessageJSONBody): Promise<Message> {
        return this.client.sendMessage(options, this.id);
    }

    public isVoice(): this is VoiceChannel {
        return this.type === ChannelType.GuildVoice;
    }

    public isText(): this is TextChannel {
        return ![
            ChannelType.GuildStageVoice, ChannelType.GuildVoice
        ].includes(this.type);
    }

    public isSendable(): boolean {
        return ![ChannelType.GuildCategory, ChannelType.GuildDirectory, ChannelType.GuildForum].includes(this.type);
    }

    public async resolveOverwrites(): Promise<InferSelectModel<typeof channelsOverwrite>[]> {
        return this.client.drizzle.query.channelsOverwrite.findMany({
            where: () => eq(channelsOverwrite.id, this.id)
        });
    }

    public async permissionsForMember(member: GuildMember): Promise<PermissionsBitField> {
        if (!this.guildId) return new PermissionsBitField(PermissionFlagsBits, 0n);
        const guild = await this.resolveGuild();
        if (!guild) return new PermissionsBitField(PermissionFlagsBits, 0n);

        if (member.id === guild.ownerId) {
            return new PermissionsBitField(PermissionFlagsBits, Object.values(PermissionFlagsBits).reduce((a, b) => a | b, 0n));
        }

        const roles = await member.resolveRoles();
        const permissions = new PermissionsBitField(PermissionFlagsBits, roles.reduce((a, b) => a | b.permissions.bits, 0n));

        if (permissions.bits & PermissionFlagsBits.Administrator) {
            return new PermissionsBitField(PermissionFlagsBits, Object.values(PermissionFlagsBits).reduce((a, b) => a | b, 0n));
        }

        const overwrites = {
            everyone: { allow: 0n, deny: 0n },
            roles: { allow: 0n, deny: 0n },
            member: { allow: 0n, deny: 0n }
        };

        for (const overwrite of await this.resolveOverwrites()) {
            if (overwrite.type === OverwriteType.Role && overwrite.deny !== null && overwrite.allow !== null) {
                if (overwrite.id === guild.id) {
                    overwrites.everyone.deny |= BigInt(overwrite.deny);
                    overwrites.everyone.allow |= BigInt(overwrite.allow);
                } else if (roles.some(x => x.id === overwrite.id)) {
                    overwrites.roles.deny |= BigInt(overwrite.deny);
                    overwrites.roles.allow |= BigInt(overwrite.allow);
                }
            } else if (overwrite.id === member.id && overwrite.deny !== null && overwrite.allow !== null) {
                overwrites.member.deny |= BigInt(overwrite.deny);
                overwrites.member.allow |= BigInt(overwrite.allow);
            }
        }

        return permissions
            .remove(overwrites.everyone.deny)
            .add(overwrites.everyone.allow)
            .remove(overwrites.roles.deny)
            .add(overwrites.roles.allow)
            .remove(overwrites.member.deny)
            .add(overwrites.member.allow)
            .freeze();
    }

    public async resolveGuild({ force, cache }: { force?: boolean; cache: boolean; } = { force: false, cache: true }): Promise<Guild | undefined> {
        if (this.guildId) {
            return this.client.resolveGuild({ id: this.guildId, force, cache });
        }

        return undefined;
    }

    public toString(): string {
        return `<#${this.id}>`;
    }
}
