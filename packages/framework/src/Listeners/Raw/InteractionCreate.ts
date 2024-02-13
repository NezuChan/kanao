import { PieceContext } from "@sapphire/pieces";
import { Listener } from "../../Stores/Listener.js";
import { ApplicationCommandType, GatewayDispatchEvents, GatewayInteractionCreateDispatch, InteractionType } from "discord-api-types/v10";
import { CommandInteraction, MessageContextMenuInteraction, UserContextMenuInteraction, AutoCompleteInteraction, MessageComponentInteraction, BaseInteraction, ModalSubmitInteraction } from "@nezuchan/core";
import { Events } from "../../Utilities/EventEnums.js";

export class InteractionCreate extends Listener {
    public constructor(context: PieceContext) {
        super(context, {
            name: GatewayDispatchEvents.InteractionCreate
        });
    }

    public run(payload: GatewayInteractionCreateDispatch["d"]): void {
        switch (payload.type) {
            case InteractionType.ApplicationCommand:
                switch (payload.data.type) {
                    case ApplicationCommandType.ChatInput: {
                        this.container.client.emit(Events.InteractionCreate, new CommandInteraction(payload, this.container.client));
                        break;
                    }
                    case ApplicationCommandType.Message: {
                        this.container.client.emit(Events.InteractionCreate, new MessageContextMenuInteraction(payload, this.container.client));
                        break;
                    }
                    case ApplicationCommandType.User: {
                        this.container.client.emit(Events.InteractionCreate, new UserContextMenuInteraction(payload, this.container.client));
                        break;
                    }
                }
                break;
            case InteractionType.ApplicationCommandAutocomplete:
                this.container.client.emit(Events.InteractionCreate, new AutoCompleteInteraction(payload, this.container.client));
                break;
            case InteractionType.MessageComponent:
                this.container.client.emit(Events.InteractionCreate, new MessageComponentInteraction(payload, this.container.client));
                break;
            case InteractionType.ModalSubmit:
                this.container.client.emit(Events.InteractionCreate, new ModalSubmitInteraction(payload, this.container.client));
                break;
            default:
                this.container.client.emit(Events.InteractionCreate, new BaseInteraction(payload, this.container.client));
                break;
        }
    }
}
