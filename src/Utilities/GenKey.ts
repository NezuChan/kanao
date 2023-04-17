import { clientId } from "../config.js";

export function GenKey(prefix: string, key?: string, guildId?: string) {
    return guildId ? [clientId, prefix, guildId, key].join(":") : [clientId, prefix, key].join(":");
}
