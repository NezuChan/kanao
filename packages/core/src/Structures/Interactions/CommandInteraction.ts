import { BaseInteraction } from "./BaseInteraction.js";

export class CommandInteraction extends BaseInteraction {
    public get commandName(): string | null {
        return this.data.data && "name" in this.data.data ? this.data.data.name : null;
    }
}
