import { Result } from "@sapphire/result";
import { IPreconditionCondition } from "./IPreconditionCondition.js";
import { PreconditionContainerResult } from "../IPreconditionContainer.js";

export const PreconditionConditionOr: IPreconditionCondition = {
    async messageSequential(message, command, entries, context) {
        let error: PreconditionContainerResult | null = null;
        for (const child of entries) {
            const result = await child.messageRun(message, command, context);
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async messageParallel(message, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.messageRun(message, command, context)));

        let error: PreconditionContainerResult | null = null;
        for (const result of results) {
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async chatInputSequential(interaction, command, entries, context) {
        let error: PreconditionContainerResult | null = null;
        for (const child of entries) {
            const result = await child.chatInputRun(interaction, command, context);
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async chatInputParallel(interaction, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.chatInputRun(interaction, command, context)));

        let error: PreconditionContainerResult | null = null;
        for (const result of results) {
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async contextMenuSequential(interaction, command, entries, context) {
        let error: PreconditionContainerResult | null = null;
        for (const child of entries) {
            const result = await child.contextMenuRun(interaction, command, context);
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async contextMenuParallel(interaction, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.contextMenuRun(interaction, command, context)));

        let error: PreconditionContainerResult | null = null;
        for (const result of results) {
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async contextCommandSequential(ctx, command, entries, context) {
        let error: PreconditionContainerResult | null = null;
        for (const child of entries) {
            const result = await child.contextRun(ctx, command, context);
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async contextCommandParallel(ctx, command, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.contextRun(ctx, command, context)));

        let error: PreconditionContainerResult | null = null;
        for (const result of results) {
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async interactionHandlerSequential(interaction, handler, entries, context) {
        let error: PreconditionContainerResult | null = null;
        for (const child of entries) {
            const result = await child.interactionHandlerRun(interaction, handler, context);
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async interactionHandlerParallel(interaction, handler, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.interactionHandlerRun(interaction, handler, context)));

        let error: PreconditionContainerResult | null = null;
        for (const result of results) {
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    }
};
