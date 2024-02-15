import { Result } from "@sapphire/result";
import type { PrehandlerContainerResult } from "../IPrehandlerContainer.js";
import type { IPrehandlerCondition } from "./IPrehandlerCondition.js";

export const PrehandlerConditionOr: IPrehandlerCondition = {
    async runSequential(request, reply, route, entries, context) {
        let error: PrehandlerContainerResult | null = null;
        for (const child of entries) {
            const result = await child.run(request, reply, route, context);
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    },
    async runParallel(request, reply, route, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.run(request, reply, route, context)));

        let error: PrehandlerContainerResult | null = null;
        for (const result of results) {
            if (result.isOk()) return result;
            error = result;
        }

        return error ?? Result.ok();
    }
};
