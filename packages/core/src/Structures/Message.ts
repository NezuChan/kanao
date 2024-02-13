/* eslint-disable max-len */
import { APIAttachment, APIEmbed, APIMessage, APIMessageComponent, APIMessageReference, APIReaction, APIStickerItem, GatewayMessageCreateDispatchData, GatewayMessageDeleteDispatch, GatewayMessageUpdateDispatch, MessageType, RESTPatchAPIChannelMessageJSONBody, Routes } from "discord-api-types/v10";
import { Base } from "./Base.js";
import { Guild } from "./Guild.js";
import { User } from "./User.js";
import { GuildMember } from "./GuildMember.js";

export class Message extends Base<APIMessage | GatewayMessageCreateDispatchData | GatewayMessageDeleteDispatch | GatewayMessageUpdateDispatch> {
    public get type(): MessageType {
        return "type" in this.data ? this.data.type : MessageType.Default;
    }

    public get content(): string {
        return "content" in this.data ? this.data.content : "";
    }

    public get guildId(): string | undefined {
        return "guild_id" in this.data ? this.data.guild_id : undefined;
    }

    public get channelId(): string | null {
        return "channel_id" in this.data ? this.data.channel_id : null;
    }

    public get webhookId(): string | undefined {
        return "webhook_id" in this.data ? this.data.webhook_id : undefined;
    }

    public get attachments(): APIAttachment[] {
        return "attachments" in this.data ? this.data.attachments : [];
    }

    public get embeds(): APIEmbed[] {
        return "embeds" in this.data ? this.data.embeds : [];
    }

    public get reactions(): APIReaction[] {
        return "reactions" in this.data ? this.data.reactions ?? [] : [];
    }

    public get stickerItems(): APIStickerItem[] {
        return "sticker_items" in this.data ? this.data.sticker_items ?? [] : [];
    }

    public get messageReference(): APIMessageReference | undefined {
        return "message_reference" in this.data ? this.data.message_reference : undefined;
    }

    public get components(): APIMessageComponent[] {
        return "components" in this.data ? this.data.components ?? [] : [];
    }

    public get mentionUsers(): APIMessage["mentions"] {
        return "mentions" in this.data ? this.data.mentions : [];
    }

    public get mentionChannels(): APIMessage["mention_channels"] {
        return "mention_channels" in this.data ? this.data.mention_channels : [];
    }

    public get mentionRoles(): APIMessage["mention_roles"] {
        return "mention_roles" in this.data ? this.data.mention_roles : [];
    }

    public get mentionEveryone(): boolean | undefined {
        return "mention_everyone" in this.data ? this.data.mention_everyone : undefined;
    }

    public async resolveGuild({ force = false, cache = true }: { force?: boolean; cache?: boolean }): Promise<Guild | undefined> {
        if (this.guildId) {
            return this.client.resolveGuild({ id: this.guildId, force, cache });
        }
    }

    public get author(): User | null {
        return "author" in this.data ? new User(this.data.author, this.client) : null;
    }

    public async resolveMember({ force = false, cache = true }: { force?: boolean; cache?: boolean }): Promise<GuildMember | undefined> {
        if (this.guildId && this.author) {
            return this.client.resolveMember({ id: this.author.id, guildId: this.guildId, force, cache });
        }
    }

    public async edit(options: RESTPatchAPIChannelMessageJSONBody): Promise<Message> {
        return this.client.rest.patch(Routes.channelMessage(this.channelId!, this.id), {
            body: options
        }).then(x => new Message(x as APIMessage, this.client));
    }
}
