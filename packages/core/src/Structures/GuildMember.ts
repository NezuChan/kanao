/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-nested-ternary */
import { APIGuildMember, GatewayGuildMemberRemoveDispatch } from "discord-api-types/v10";
import { Base } from "./Base.js";
import { User } from "./User.js";
import { Role } from "./Role.js";
import { VoiceState } from "./VoiceState.js";
import { BaseImageURLOptions } from "@discordjs/rest";

export class GuildMember extends Base<APIGuildMember | GatewayGuildMemberRemoveDispatch["d"]> {
    public get id(): string {
        return this.data.id ?? this.data.user!.id;
    }

    public get guildId(): string | undefined {
        return "guild_id" in this.data ? this.data.guild_id : undefined;
    }

    public get nickname(): string | null | undefined {
        return "nick" in this.data ? this.data.nick : null;
    }

    public get roles(): string[] {
        return "roles" in this.data ? this.data.roles : [];
    }

    public get joinedAt(): Date | undefined {
        return "joined_at" in this.data ? this.data.joined_at && this.data.joined_at ? new Date(this.data.joined_at) : undefined : undefined;
    }

    public get premiumSince(): Date | undefined {
        return "premium_since" in this.data ? this.data.premium_since && this.data.premium_since ? new Date(this.data.premium_since) : undefined : undefined;
    }

    public get communicationDisabledUntilTimestamp(): number | null {
        return "communication_disabled_until" in this.data && this.data.communication_disabled_until ? Date.parse(this.data.communication_disabled_until) : null;
    }

    public get communicationDisabledUntil(): Date | null {
        return this.communicationDisabledUntilTimestamp ? new Date(this.communicationDisabledUntilTimestamp) : null;
    }

    public displayAvatarURL(options?: BaseImageURLOptions): string | null {
        return "avatar" in this.data && this.data.avatar ? this.client.rest.cdn.guildMemberAvatar(this.guildId!, this.id, this.data.avatar, options) : null;
    }

    public async manageable(): Promise<boolean> {
        const guild = await this.client.resolveGuild({ id: this.guildId! });
        if (this.id === guild?.ownerId) return false;
        if (this.id === this.client.clientId) return false;
        if (this.client.clientId === guild?.ownerId) return true;

        const clientMember = await this.client.resolveMember({ id: this.client.clientId, guildId: this.guildId! });
        if (!clientMember) return false;

        const clientRoles = await clientMember.resolveRoles();
        const memberRoles = await this.resolveRoles();

        if (clientRoles[0].position > memberRoles[0].position) return true;
        return false;
    }

    public async resolveRoles(): Promise<Role[]> {
        const roles = [];
        if (this.guildId) {
            for (const id of this.roles) {
                const role = await this.client.resolveRole({ id, guildId: this.guildId });
                if (role) roles.push(role);
            }
            const everyoneRole = await this.client.resolveRole({ id: this.guildId, guildId: this.guildId });
            if (everyoneRole) roles.push(everyoneRole);
        }
        return roles.sort((a, b) => b.position - a.position);
    }

    public async resolveUser({ force = false, cache = true }: { force?: boolean; cache?: boolean }): Promise<User | undefined> {
        if (this.data.user) {
            return new User(this.data.user, this.client);
        }

        return this.client.resolveUser({ id: this.id, force, cache });
    }

    public async resolveVoiceState(): Promise<VoiceState | undefined> {
        if (this.guildId) {
            return this.client.resolveVoiceState({ id: this.id, guildId: this.guildId });
        }
    }

    public toString(): string {
        return `<@!${this.id}>`;
    }
}
