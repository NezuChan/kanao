/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { NezuGateway } from "./Structures/NezuGateway.js";
const gateway = new NezuGateway();

try {
    await gateway.connect();
} catch (e) {
    gateway.logger.error(e, "An error occurred while connecting to Discord");
    process.exit(1);
}

process.on("unhandledRejection", e => {
    if (e instanceof Error) {
        gateway.logger.error(e);
    } else {
        gateway.logger.error(Error(`PromiseError: ${e}`));
    }
});
process.on("uncaughtException", e => {
    gateway.logger.fatal(e);
    process.exit(1);
});
