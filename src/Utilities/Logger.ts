import { resolve } from "path";
import { pino, Logger } from "pino";
import { Util } from "@nezuchan/utilities";
import { production } from "../config.js";

export function createLogger(name: string, clientId: string, storeLogs: boolean, lokiHost?: URL): Logger {
    const level = production ? "info" : "trace";

    const targets: pino.TransportTargetOptions[] = [{ target: "pino-pretty", level, options: { translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l o" } }];

    if (storeLogs) targets.push({ target: "pino/file", level, options: { destination: resolve(process.cwd(), "logs", `${name}-${date()}.log`) } });

    if (lokiHost !== undefined) {
        targets.push(
            {
                target: "pino-loki",
                level,
                options: { host: lokiHost.href, labels: { application: name, clientId } }
            }
        );
    }

    return pino({
        name,
        timestamp: true,
        level: production ? "info" : "trace",
        transport: { targets }
    });
}

function date(): string {
    return Util.formatDate(Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour12: false
    }));
}
