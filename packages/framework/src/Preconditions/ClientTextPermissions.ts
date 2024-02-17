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
        if (ctx.isInteraction() && !ctx.interaction.deferred) await ctx.interaction.deferReply();
        const guildId = ctx.isMessage() ? ctx.message.guildId! : ctx.interaction.guildId;
        const client = await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId });
        const channelId = ctx.isMessage() ? ctx.message.channelId : ctx.interaction.channelId;
        return this.parseConditions(guildId, channelId, client, context);
    }

    public async interactionHandlerRun(interaction: BaseInteraction, handler: InteractionHandler, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        return this.parseConditions(interaction.guildId, interaction.channelId, await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId }), context);
    }

    public async chatInputRun(interaction: CommandInteraction, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        if (!interaction.deferred) await interaction.deferReply();
        return this.parseConditions(interaction.guildId, interaction.channelId, await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId }), context);
    }

    public async messageRun(message: Message, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        return this.parseConditions(message.guildId, message.channelId, await this.container.client.resolveUser({ cache: true, id: this.container.client.clientId }), context);
    }

    public async parseConditions(guildId: string | null | undefined, channelId: string | null, client: User | null | undefined, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        if (guildId !== null && guildId !== undefined && client && channelId !== null) {
            const channel = await this.container.client.resolveChannel({ id: channelId, guildId, fetch: true, cache: true });
            const member = await this.container.client.resolveMember({ id: client.id, guildId, fetch: true, cache: true });
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
