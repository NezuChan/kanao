import { clientId } from "../config.js";
import { GenKey as OGenKey } from "@nezuchan/utilities";

export function GenKey(prefix: string, key?: string, guildId?: string) {
    return OGenKey(clientId, prefix, key, guildId);
}
