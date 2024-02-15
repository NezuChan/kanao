import { Result } from "@sapphire/result";
import type { IPrehandlerCondition } from "./IPrehandlerCondition.js";

export const PrehandlerConditionAnd: IPrehandlerCondition = {
    async runSequential(request, reply, route, entries, context) {
        for (const child of entries) {
            const result = await child.run(request, reply, route, context);
            if (result.isErr()) return result;
        }

        return Result.ok();
    },
    async runParallel(request, reply, route, entries, context) {
        const results = await Promise.all(entries.map(entry => entry.run(request, reply, route, context)));
        return results.find(res => res.isErr()) ?? Result.ok();
    }
};
