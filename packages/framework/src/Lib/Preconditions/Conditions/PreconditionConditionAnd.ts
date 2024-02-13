import { Result } from "@sapphire/result";
import { IPreconditionCondition } from "./IPreconditionCondition.js";

export const PreconditionConditionAnd: IPreconditionCondition = {
    async messageSequential(message, command, entries, context) {
        for (const child of entries) {
            const result = await child.messageRun(message, command, context);
            if (result.isErr()) return result;
        }

        return Result.ok();
    },
    async messageParallel(message, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.messageRun(message, command, context)));
        return results.find(res => res.isErr()) ?? Result.ok();
    },
    async chatInputSequential(interaction, command, entries, context) {
        for (const child of entries) {
            const result = await child.chatInputRun(interaction, command, context);
            if (result.isErr()) return result;
        }

        return Result.ok();
    },
    async chatInputParallel(interaction, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.chatInputRun(interaction, command, context)));
        return results.find(res => res.isErr()) ?? Result.ok();
    },
    async contextMenuSequential(interaction, command, entries, context) {
        for (const child of entries) {
            const result = await child.contextMenuRun(interaction, command, context);
            if (result.isErr()) return result;
        }

        return Result.ok();
    },
    async contextMenuParallel(interaction, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.contextMenuRun(interaction, command, context)));
        return results.find(res => res.isErr()) ?? Result.ok();
    },
    async contextCommandSequential(ctx, command, entries, context) {
        for (const child of entries) {
            const result = await child.contextRun(ctx, command, context);
            if (result.isErr()) return result;
        }

        return Result.ok();
    },
    async contextCommandParallel(ctx, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.contextRun(ctx, command, context)));
        return results.find(res => res.isErr()) ?? Result.ok();
    },
    async interactionHandlerParallel(interaction, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.interactionHandlerRun(interaction, command, context)));
        return results.find(res => res.isErr()) ?? Result.ok();
    },
    async interactionHandlerSequential(interaction, command, entries, context) {
        for (const child of entries) {
            const result = await child.interactionHandlerRun(interaction, command, context);
            if (result.isErr()) return result;
        }

        return Result.ok();
    }
};
