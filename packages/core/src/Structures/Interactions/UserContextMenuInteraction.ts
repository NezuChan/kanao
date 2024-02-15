import { GuildMember } from "../GuildMember.js";
import { User } from "../User.js";
import { BaseContextMenuInteraction } from "./BaseContextMenuInteraction.js";

export class UserContextMenuInteraction extends BaseContextMenuInteraction {
    public get getUser(): User | null {
        return this.data.data && "target_id" in this.data.data && "users" in this.data.data.resolved ? new User(this.data.data.resolved.users[this.data.data.target_id], this.client) : null;
    }

    public get getMember(): GuildMember | null {
        const member = this.data.data && "target_id" in this.data.data && "members" in this.data.data.resolved && this.data.data.resolved.members ? { ...this.data.data.resolved.members[this.data.data.target_id], id: this.data.data.target_id } : null;
        if (member) {
            return new GuildMember({
                id: member.id,
                guildId: this.data.guild_id!,
                avatar: member.avatar ?? null,
                flags: member.flags as unknown as number,
                communicationDisabledUntil: member.communication_disabled_until ?? null,
                deaf: null,
                mute: null,
                joinedAt: member.joined_at,
                nick: member.nick ?? null,
                pending: member.pending ?? false,
                premiumSince: member.premium_since ?? null
            }, this.client);
        }

        return null;
    }
}
