import { APIGuildMember } from "discord-api-types/v10";
import { GuildMember } from "../GuildMember.js";
import { BaseContextMenuInteraction } from "./BaseContextMenuInteraction.js";
import { User } from "../User.js";

export class UserContextMenuInteraction extends BaseContextMenuInteraction {
    public get getUser(): User | null {
        return this.data.data && "target_id" in this.data.data && "users" in this.data.data.resolved ? new User(this.data.data.resolved.users[this.data.data.target_id], this.client) : null;
    }

    public get getMember(): GuildMember | null {
        return this.data.data && "target_id" in this.data.data && "members" in this.data.data.resolved && this.data.data.resolved.members ? new GuildMember(this.data.data.resolved.members[this.data.data.target_id] as unknown as APIGuildMember & { id: string }, this.client) : null;
    }
}
