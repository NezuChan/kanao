/* eslint-disable max-len */
import { APIChannel, APIInteractionResponseCallbackData, APIMessage, ApplicationCommandType, ComponentType, GatewayInteractionCreateDispatchData, InteractionResponseType, InteractionType, MessageFlags, PermissionFlagsBits, Routes, Snowflake } from "discord-api-types/v10";
import { Base } from "../Base.js";
import { CommandOptionsResolver } from "./CommandOptionsResolver.js";
import { PermissionsBitField } from "../PermissionsBitField.js";
import { GuildMember } from "../GuildMember.js";
import { Message } from "../Message.js";
import { CommandInteraction } from "./CommandInteraction.js";
import { BaseContextMenuInteraction } from "./BaseContextMenuInteraction.js";
import { AutoCompleteInteraction } from "./AutoCompleteInteraction.js";
import { MessageComponentInteraction } from "./MessageComponentInteraction.js";
import { ModalSubmitInteraction } from "./ModalSubmitInteraction.js";
import { Guild } from "../Guild.js";

export class BaseInteraction extends Base<GatewayInteractionCreateDispatchData> {
    public deferred = false;
    public replied = false;

    public get options(): CommandOptionsResolver {
        return new CommandOptionsResolver(this.data.data);
    }

    public get type(): InteractionType {
        return this.data.type;
    }

    public get commandType(): ApplicationCommandType | null {
        return this.data.data && "type" in this.data.data ? this.data.data.type : null;
    }

    public get applicationId(): Snowflake {
        return this.data.application_id;
    }

    public get channelId(): Snowflake | null {
        return this.data.channel?.id ?? null;
    }

    public get guildId(): Snowflake | undefined {
        return this.data.guild_id;
    }

    public get channel(): Partial<APIChannel> & Pick<APIChannel, "id" | "type"> | undefined {
        return this.data.channel;
    }

    public get applicationPermissions(): PermissionsBitField | null {
        return this.data.app_permissions ? new PermissionsBitField(PermissionFlagsBits, BigInt(this.data.app_permissions)).freeze() : null;
    }

    public get memberPermissions(): PermissionsBitField | null {
        return this.data.member?.permissions ? new PermissionsBitField(PermissionFlagsBits, BigInt(this.data.member.permissions)).freeze() : null;
    }

    public get member(): GuildMember | null {
        return this.data.member ? new GuildMember({ id: this.data.member.user.id, ...this.data.member }, this.client) : null;
    }

    public async resolveClientMember({ force, cache }: { force?: boolean; cache: boolean } = { force: false, cache: true }): Promise<GuildMember | undefined> {
        if (this.guildId) {
            return this.client.resolveMember({ id: this.client.clientId, guildId: this.guildId, force, cache });
        }
    }

    public async resolveGuild({ force, cache }: { force?: boolean; cache: boolean } = { force: false, cache: true }): Promise<Guild | undefined> {
        if (this.guildId) {
            return this.client.resolveGuild({ id: this.guildId, force, cache });
        }
    }

    public async reply(options: APIInteractionResponseCallbackData): Promise<this> {
        if (this.deferred || this.replied) return Promise.reject(new Error("This interaction has already been deferred or replied."));
        await this.client.rest.post(Routes.interactionCallback(this.id, this.data.token), {
            body: {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: options
            },
            auth: false
        });
        this.replied = true;
        return this;
    }

    public async editReply(options: APIInteractionResponseCallbackData): Promise<Message> {
        if (!this.deferred && !this.replied) return Promise.reject(new Error("This interaction is not deferred or replied yet."));
        const message = await this.client.rest.patch(Routes.webhookMessage(this.applicationId, this.data.token), {
            body: options,
            auth: false
        });
        this.replied = true;
        return new Message(message as APIMessage, this.client);
    }

    public async deleteReply(): Promise<this> {
        await this.client.rest.delete(Routes.webhookMessage(this.applicationId, this.data.token), {
            auth: false
        });
        return this;
    }

    public async deferReply(ephemeral?: boolean): Promise<this> {
        await this.client.rest.post(Routes.interactionCallback(this.id, this.data.token), {
            body: {
                type: InteractionResponseType.DeferredChannelMessageWithSource,
                data: {
                    flags: ephemeral ? MessageFlags.Ephemeral : undefined
                }
            },
            auth: false
        });
        this.deferred = true;
        return this;
    }

    public async followUp(options: APIInteractionResponseCallbackData): Promise<Message> {
        if (!this.deferred && !this.replied) return Promise.reject(new Error("This interaction is not deferred or replied yet."));
        const message = await this.client.rest.post(Routes.webhook(this.applicationId, this.data.token), {
            body: options,
            auth: false
        });
        return new Message(message as APIMessage, this.client);
    }

    public async showModal(options: APIInteractionResponseCallbackData): Promise<this> {
        if (this.deferred || this.replied) return Promise.reject(new Error("This interaction is already deferred or replied."));
        await this.client.rest.post(Routes.interactionCallback(this.id, this.data.token), {
            body: {
                type: InteractionResponseType.Modal,
                data: options
            },
            auth: false
        });
        this.replied = true;
        return this;
    }

    public isCommandInteraction(): this is CommandInteraction {
        return this.type === InteractionType.ApplicationCommand && this.commandType === ApplicationCommandType.ChatInput;
    }

    public isContextMenuInteraction(): this is BaseContextMenuInteraction {
        return this.type === InteractionType.ApplicationCommand && (this.commandType === ApplicationCommandType.User || this.commandType === ApplicationCommandType.Message);
    }

    public isAutoCompleteInteraction(): this is AutoCompleteInteraction {
        return this.data.type === InteractionType.ApplicationCommandAutocomplete;
    }

    public isComponentInteraction(): this is MessageComponentInteraction {
        return this.data.type === InteractionType.MessageComponent;
    }

    public isModalSubmit(): this is ModalSubmitInteraction {
        return this.data.type === InteractionType.ModalSubmit;
    }

    public isButton(): this is MessageComponentInteraction {
        return this.isComponentInteraction() && this.componentType === ComponentType.Button;
    }

    public isSelectMenu(): this is MessageComponentInteraction {
        return this.isComponentInteraction() && this.componentType === ComponentType.SelectMenu;
    }
}
