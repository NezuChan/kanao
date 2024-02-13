import { ApplicationCommandType } from "discord-api-types/v10";
import { BaseInteraction } from "./BaseInteraction.js";
import { MessageContextMenuInteraction } from "./MessageContextMenuInteraction.js";
import { UserContextMenuInteraction } from "./UserContextMenuInteraction.js";

export class BaseContextMenuInteraction extends BaseInteraction {
    public get commandName(): string | null {
        return this.data.data && "name" in this.data.data ? this.data.data.name : null;
    }

    public isUserContext(): this is UserContextMenuInteraction {
        return this.commandType === ApplicationCommandType.User;
    }

    public isMessageContext(): this is MessageContextMenuInteraction {
        return this.commandType === ApplicationCommandType.Message;
    }
}
