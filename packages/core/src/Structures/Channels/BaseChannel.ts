import { APIChannel, APIOverwrite, ChannelFlags, ChannelType, OverwriteType, PermissionFlagsBits, RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { Base } from "../Base.js";
import { Message } from "../Message.js";
import { TextChannel } from "./TextChannel.js";
import { VoiceChannel } from "./VoiceChannel.js";
import { GuildMember } from "../GuildMember.js";
import { PermissionsBitField } from "../PermissionsBitField.js";
import { Guild } from "../Guild.js";

export class BaseChannel extends Base<APIChannel> {
    public get guildId(): string | undefined {
        return "guild_id" in this.data ? this.data.guild_id : undefined;
    }

    public get name(): string | null {
        return this.data.name;
    }

    public get type(): ChannelType {
        return this.data.type;
    }

    public get flags(): ChannelFlags | undefined {
        return this.data.flags;
    }

    public get position(): number | undefined {
        return "position" in this.data ? this.data.position : undefined;
    }

    public get parentId(): string | undefined {
        return "parent_id" in this.data ? this.data.parent_id ?? undefined : undefined;
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

    public get permissionOverwrites(): APIOverwrite[] {
        return "permission_overwrites" in this.data ? this.data.permission_overwrites ?? [] : [];
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

        for (const overwrite of this.permissionOverwrites) {
            if (overwrite.type === OverwriteType.Role) {
                if (overwrite.id === guild.id) {
                    overwrites.everyone.deny |= BigInt(overwrite.deny);
                    overwrites.everyone.allow |= BigInt(overwrite.allow);
                } else if (roles.find(x => x.id === overwrite.id)) {
                    overwrites.roles.deny |= BigInt(overwrite.deny);
                    overwrites.roles.allow |= BigInt(overwrite.allow);
                }
            } else if (overwrite.id === member.id) {
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

    public async resolveGuild({ force, cache }: { force?: boolean; cache: boolean } = { force: false, cache: true }): Promise<Guild | undefined> {
        if (this.guildId) {
            return this.client.resolveGuild({ id: this.guildId, force, cache });
        }
    }

    public toString(): string {
        return `<#${this.id}>`;
    }
}
