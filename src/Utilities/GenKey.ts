import { GenKey as OGenKey } from "@nezuchan/utilities";
import { clientId } from "../config.js";

export function GenKey(prefix: string, key?: string, guildId?: string): string {
    return OGenKey(clientId, prefix, key, guildId);
}
