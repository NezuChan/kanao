import { ProcessBootstrapper } from "./ProcessBootstrapper.js";
import { NezuGateway } from "../../Structures/NezuGateway.js";

const gateway = new NezuGateway();
await gateway.connect();

const bootstrapper = new ProcessBootstrapper();
void bootstrapper.bootstrap({ });
