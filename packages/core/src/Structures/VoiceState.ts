import type { voiceStates } from "@nezuchan/kanao-schema";
import type { InferSelectModel } from "drizzle-orm";
import { Base } from "./Base.js";
import type { GuildMember } from "./GuildMember.js";

export class VoiceState extends Base<InferSelectModel<typeof voiceStates>> {
    public get id(): string {
        return this.data.memberId;
    }

    public get guildId(): string {
        return this.data.guildId;
    }

    public get channelId(): string {
        return this.data.channelId;
    }

    public get sessionId(): string {
        return this.data.sessionId!;
    }

    public get deaf(): boolean {
        return this.data.deaf!;
    }

    public get mute(): boolean {
        return this.data.mute!;
    }

    public get selfDeaf(): boolean {
        return this.data.selfDeaf!;
    }

    public get selfMute(): boolean {
        return this.data.selfMute!;
    }

    public get requestToSpeakTimestamp(): Date | null {
        return this.data.requestToSpeakTimestamp ? new Date(this.data.requestToSpeakTimestamp) : null;
    }

    public async resolveMember({ force = false, cache = true }: { force?: boolean; cache?: boolean; }): Promise<GuildMember | undefined> {
        if (this.guildId && this.id) {
            return this.client.resolveMember({ id: this.id, guildId: this.guildId, force, cache });
        }

        return undefined;
    }
}
