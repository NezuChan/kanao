import type { BaseImageURLOptions } from "@discordjs/rest";
import type { members } from "@nezuchan/kanao-schema";
import { memberRoles, roles } from "@nezuchan/kanao-schema";
import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { Base } from "./Base.js";
import { Role } from "./Role.js";
import type { User } from "./User.js";
import type { VoiceState } from "./VoiceState.js";

export class GuildMember extends Base<InferSelectModel<typeof members>> {
    public get id(): string {
        return this.data.id;
    }

    public get guildId(): string | null {
        return this.data.guildId;
    }

    public get nickname(): string | null {
        return this.data.nick;
    }

    public get joinedAt(): Date | null {
        return this.data.joinedAt ? new Date(this.data.joinedAt) : null;
    }

    public get premiumSince(): Date | null {
        return this.data.premiumSince ? new Date(this.data.premiumSince) : null;
    }

    public get communicationDisabledUntilTimestamp(): number | null {
        return this.data.communicationDisabledUntil ? Date.parse(this.data.communicationDisabledUntil) : null;
    }

    public get communicationDisabledUntil(): Date | null {
        return this.communicationDisabledUntilTimestamp ? new Date(this.communicationDisabledUntilTimestamp) : null;
    }

    public displayAvatarURL(options?: BaseImageURLOptions): string | null {
        return this.data.avatar ? this.client.rest.cdn.guildMemberAvatar(this.guildId!, this.id, this.data.avatar, options) : null;
    }

    public async manageable(): Promise<boolean> {
        const guild = await this.client.resolveGuild({ id: this.guildId! });
        if (this.id === guild?.ownerId) return false;
        if (this.id === this.client.clientId) return false;
        if (this.client.clientId === guild?.ownerId) return true;

        const clientMember = await this.client.resolveMember({ id: this.client.clientId, guildId: this.guildId! });
        if (!clientMember) return false;

        const clientRoles = await clientMember.resolveRoles();
        const mRoles = await this.resolveRoles();

        if (clientRoles[0].position > mRoles[0].position) return true;
        return false;
    }

    public async resolveRoles(): Promise<Role[]> {
        const mRoles = [];
        if (this.guildId) {
            const guildMemberRoles = await this.client.store.select({
                role: roles
            }).from(memberRoles)
                .where(and(eq(memberRoles.memberId, this.id), eq(memberRoles.guildId, this.guildId)))
                .leftJoin(roles, eq(memberRoles.roleId, roles.id));

            for (const { role } of guildMemberRoles) {
                if (role) mRoles.push(new Role(role, this.client));
            }

            const everyoneRole = await this.client.resolveRole({ id: this.guildId, guildId: this.guildId });
            if (everyoneRole) mRoles.push(everyoneRole);
        }
        return mRoles.sort((a, b) => b.position - a.position);
    }

    public async resolveUser({ force = false, cache = true }: { force?: boolean; cache?: boolean; }): Promise<User | undefined> {
        return this.client.resolveUser({ id: this.id, force, cache });
    }

    public async resolveVoiceState(): Promise<VoiceState | undefined> {
        if (this.guildId) {
            return this.client.resolveVoiceState({ id: this.id, guildId: this.guildId });
        }

        return undefined;
    }

    public toString(): string {
        return `<@!${this.id}>`;
    }
}
