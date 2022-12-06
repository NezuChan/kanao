import { NezuGateway } from "./Structures/NezuGateway.js";
const gateway = new NezuGateway();

try {
    await gateway.connect();
} catch (e) {
    gateway.logger.error(e, "An error occurred while connecting to Discord");
    process.exit(1);
}
