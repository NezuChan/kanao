import { AliasStore } from "@sapphire/pieces";
import type { APIApplicationCommandOption } from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10.js";
import { Events } from "../Utilities/EventEnums.js";
import { Command } from "./Command.js";

export class CommandStore extends AliasStore<Command> {
    public constructor() {
        super(Command, { name: "commands" });
    }

    public async postCommands(): Promise<void> {
        const commands = [...this.values()];
        const registerAbleCommands: APIApplicationCommandOption[] = [];

        for (const command of commands) {
            if (command.options.chatInput) {
                this.container.client.emit(Events.RegisteringCommand, command);
                registerAbleCommands.push(command.options.chatInput);
            }

            if (command.options.contextMenu) {
                this.container.client.emit(Events.RegisteringCommand, command);
                registerAbleCommands.push(command.options.contextMenu);
            }
        }

        if (registerAbleCommands.length > 0) {
            await this.container.client.rest.put(Routes.applicationCommands(this.container.client.clientId), {
                body: registerAbleCommands
            });
            this.container.client.emit(Events.CommandRegistered, registerAbleCommands);
        }
    }
}
