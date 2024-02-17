/* eslint-disable stylistic/max-len */
import { inlineCode } from "@discordjs/builders";
import type { BaseInteraction, Message, PermissionsBitField } from "@nezuchan/core";
import type { Result } from "@sapphire/result";
import type { CommandContext } from "../Lib/CommandContext.js";
import type { Command } from "../Stores/Command.js";
import type { InteractionHandler } from "../Stores/InteractionHandler.js";
import { Precondition } from "../Stores/Precondition.js";
import type { UserError } from "../Utilities/Errors/UserError.js";

export class UserPermissions extends Precondition {
    public async contextRun(ctx: CommandContext, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        if (ctx.isInteraction() && !ctx.interaction.deferred) await ctx.interaction.deferReply();
        const guildId = ctx.isMessage() ? ctx.message.guildId : ctx.interaction.guildId;
        const user = ctx.isMessage() ? ctx.message.author : await ctx.interaction.member?.resolveUser({ cache: true });
        const channelId = ctx.isMessage() ? ctx.message.channelId : ctx.interaction.channelId;
        return this.parseConditions(guildId, channelId, user, context);
    }

    public async interactionHandlerRun(interaction: BaseInteraction, handler: InteractionHandler, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        return this.parseConditions(interaction.guildId, interaction.channelId, await interaction.member?.resolveUser({ cache: true }), context);
    }

    public async chatInputRun(interaction: BaseInteraction, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        if (!interaction.deferred) await interaction.deferReply();
        return this.parseConditions(interaction.guildId, interaction.channelId, await interaction.member?.resolveUser({ cache: true }), context);
    }

    public async messageRun(message: Message, command: Command, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        return this.parseConditions(message.guildId, message.channelId, message.author, context);
    }

    public async parseConditions(guildId: string | null | undefined, channelId: string | null, user: { id: string; } | null | undefined, context: { permissions: PermissionsBitField; }): Promise<Result<unknown, UserError>> {
        if (guildId && user && channelId) {
            const channel = await this.container.client.resolveChannel({ id: channelId, guildId });
            const member = await this.container.client.resolveMember({ id: user.id, guildId });
            if (channel && member) {
                const permissions = await channel.permissionsForMember(member);
                const missing = permissions.missing(context.permissions);
                if (missing.length > 0) {
                    return this.error({ message: `You dont have permissions: ${missing.map(x => inlineCode(String(x))).join(", ")}` });
                }

                return this.ok();
            }
        }

        return this.error({ message: `You dont have permissions: ${context.permissions.toArray().map(x => inlineCode(String(x))).join(", ")}` });
    }
}
