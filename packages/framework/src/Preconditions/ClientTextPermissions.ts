/* eslint-disable stylistic/max-len */
import { inlineCode } from "@discordjs/builders";
import type { BaseInteraction, CommandInteraction, Message, PermissionsBitField, User } from "@nezuchan/core";
import type { Result } from "@sapphire/result";
import type { CommandContext } from "../Lib/CommandContext.js";
import type { Command } from "../Stores/Command.js";
import type { InteractionHandler } from "../Stores/InteractionHandler.js";
import { Precondition } from "../Stores/Precondition.js";
import type { UserError } from "../Utilities/Errors/UserError.js";

export class ClientTextPermissions extends Precondition {
    public async contextRun(ctx: CommandContext, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        const guildId = ctx.isMessage() ? ctx.message.guildId! : ctx.interaction.guildId;
        const user = ctx.isMessage() ? ctx.message.author : await ctx.interaction.member?.resolveUser({ cache: true });
        const client = await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId });
        const channelId = ctx.isMessage() ? ctx.message.channelId : ctx.interaction.channelId;
        return this.parseConditions(guildId, channelId, user, client, context);
    }

    public async interactionHandlerRun(interaction: BaseInteraction, handler: InteractionHandler, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        return this.parseConditions(interaction.guildId, interaction.channelId, await interaction.member?.resolveUser({ force: true }), await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId }), context);
    }

    public async chatInputRun(interaction: CommandInteraction, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        return this.parseConditions(interaction.guildId, interaction.channelId, await interaction.member?.resolveUser({ force: true }), await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId }), context);
    }

    public async messageRun(message: Message, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        return this.parseConditions(message.guildId, message.channelId, message.author, await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId }), context);
    }

    public async parseConditions(guildId: string | null | undefined, channelId: string | null, user: User | null | undefined, client: User | null | undefined, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        if (guildId !== null && guildId !== undefined && client && channelId !== null) {
            const channel = await this.container.client.resolveChannel({ id: channelId, guildId, cache: true });
            const member = await this.container.client.resolveMember({ id: client.id, guildId, cache: true });
            if (channel && member) {
                const permissions = await channel.permissionsForMember(member);
                const missing = permissions.missing(context.permissions);
                if (missing.length > 0) {
                    return this.error({ message: `I dont have permissions: ${missing.map(x => inlineCode(String(x))).join(", ")}` });
                }

                return this.ok();
            }
        }

        return this.error({ message: `I dont have permissions: ${context.permissions.toArray().map(x => inlineCode(String(x))).join(", ")}` });
    }
}
