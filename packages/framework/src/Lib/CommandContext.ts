import { BaseChannel, BaseInteraction, Guild, GuildMember, Message, User } from "@nezuchan/core";
import { ArgumentStream } from "@sapphire/lexure";
import { APIInteractionResponseCallbackData, RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";

export class CommandContext {
    public constructor(private readonly context: BaseInteraction | Message, public messageArgs: ArgumentStream) { }

    public get message(): Message {
        return this.context as Message;
    }

    public get interaction(): BaseInteraction {
        return this.context as BaseInteraction;
    }

    public isInteraction(): boolean {
        return this.context instanceof BaseInteraction;
    }

    public isMessage(): boolean {
        return this.context instanceof Message;
    }

    public send(options: APIInteractionResponseCallbackData | RESTPostAPIChannelMessageJSONBody): Promise<BaseInteraction> | Promise<Message> {
        if (this.isInteraction()) {
            if (this.interaction.isCommandInteraction() && (this.interaction.isContextMenuInteraction() || this.interaction.isCommandInteraction())) {
                if (this.interaction.deferred && !this.interaction.replied) {
                    return this.interaction.editReply(options);
                }

                if (this.interaction.replied) {
                    return this.interaction.followUp(options);
                }
            }

            return this.interaction.reply(options);
        }
        return this.message.client.sendMessage(options, this.message.channelId!);
    }

    public get guildId(): string | undefined {
        if (this.isInteraction()) return this.interaction.guildId;
        return this.message.guildId;
    }

    public get channelId(): string | null {
        if (this.isInteraction()) return this.interaction.channelId;
        return this.message.channelId!;
    }

    public get userId(): string | undefined {
        if (this.isInteraction()) return this.interaction.member?.id;
        return this.message.author?.id;
    }

    public async resolveMember({ force, cache }: { force?: boolean; cache: boolean } = { force: false, cache: true }): Promise<GuildMember | null | undefined> {
        if (this.isInteraction()) return Promise.resolve(this.interaction.member);
        return this.message.resolveMember({ force, cache });
    }

    public async resolveUser({ force, cache }: { force?: boolean; cache: boolean } = { force: false, cache: true }): Promise<User | null | undefined> {
        if (this.isInteraction()) return this.interaction.member?.resolveUser({ force, cache });
        return Promise.resolve(this.message.author);
    }

    public async resolveGuild({ force, cache }: { force?: boolean; cache: boolean } = { force: false, cache: true }): Promise<Guild | null | undefined> {
        if (this.isInteraction()) return this.interaction.resolveGuild({ force, cache });
        return this.message.resolveGuild({ force, cache });
    }

    public async resolveChannel({ force, cache }: { force?: boolean; cache: boolean } = { force: false, cache: true }): Promise<BaseChannel | undefined> {
        return this.interaction.client.resolveChannel({ force, cache, guildId: this.guildId!, id: this.channelId! });
    }
}
