/* eslint-disable class-methods-use-this */
import { PieceContext } from "@sapphire/pieces";
import { Listener } from "../../Stores/Listener.js";
import { Events } from "../../Utilities/EventEnums.js";
import { Message } from "@nezuchan/core";

export class PrefixedMessage extends Listener {
    public constructor(context: PieceContext) {
        super(context, {
            name: Events.PrefixedMessage
        });
    }

    public run(message: Message, prefix: RegExp | string): any {
        const commandPrefix = this.getCommandPrefix(message.content, prefix);
        const prefixLess = message.content.slice(commandPrefix.length).trim();

        const spaceIndex = prefixLess.indexOf(" ");
        const commandName = spaceIndex === -1 ? prefixLess : prefixLess.slice(0, spaceIndex);
        if (commandName.length === 0) {
            this.container.client.emit(Events.UnknownMessageCommandName, { message, prefix, commandPrefix, prefixLess });
            return;
        }

        const command = this.container.stores.get("commands").get(this.container.client.options.caseInsensitiveCommands ? commandName.toLowerCase() : commandName);
        if (!command) {
            this.container.client.emit(Events.UnknownMessageCommand, { message, prefix, commandName, commandPrefix, prefixLess });
            return;
        }

        const parameters = spaceIndex === -1 ? "" : prefixLess.substring(spaceIndex + 1).trim();

        if (command.messageRun) {
            this.container.client.emit(Events.PreMessageCommandRun, {
                message,
                command,
                parameters,
                context: { commandName, commandPrefix, prefix, prefixLess }
            });
            return;
        }

        if (command.options.enableMessageCommand === false) {
            this.container.client.emit(Events.MessageCommandDisabled, {
                message,
                command,
                parameters,
                context: { commandName, commandPrefix, prefix, prefixLess }
            });
            return;
        }

        if (command.contextRun) {
            this.container.client.emit(Events.PreContextCommandRun, {
                message,
                command,
                parameters,
                context: message,
                prefixLess
            });
        }
    }

    private getCommandPrefix(content: string, prefix: RegExp | string): string {
        return typeof prefix === "string" ? prefix : prefix.exec(content)![0];
    }
}
