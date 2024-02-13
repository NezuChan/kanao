/* eslint-disable @typescript-eslint/no-extra-parens */
import { Store } from "@sapphire/pieces";
import { InteractionHandler, InteractionHandlerTypes } from "./InteractionHandler.js";
import { BaseInteraction } from "@nezuchan/core";
import { Result } from "@sapphire/result";
import { Events } from "../Utilities/EventEnums.js";

export const InteractionHandlerFilters = new Map<InteractionHandlerTypes, (interaction: BaseInteraction) => boolean>([
    [InteractionHandlerTypes.Button, interaction => interaction.isButton()],
    [InteractionHandlerTypes.SelectMenu, interaction => interaction.isSelectMenu()],
    [InteractionHandlerTypes.ModalSubmit, interaction => interaction.isModalSubmit()],

    [InteractionHandlerTypes.MessageComponent, interaction => interaction.isComponentInteraction()],
    [InteractionHandlerTypes.Autocomplete, Interaction => Interaction.isAutoCompleteInteraction()]
]);


export class InteractionHandlerStore extends Store<InteractionHandler> {
    public constructor() {
        super(InteractionHandler, { name: "interaction-handlers" });
    }

    public async run(interaction: BaseInteraction): Promise<boolean> {
        if (this.size === 0) return false;

        const promises: Promise<Result<unknown, { handler: InteractionHandler; error: unknown }>>[] = [];

        for (const handler of this.values()) {
            const filter = InteractionHandlerFilters.get(handler.options.interactionHandlerType);

            if (!filter?.(interaction)) continue;

            const result = await Result.fromAsync(() => handler.parse(interaction));

            result.match({
                ok: option => {
                    option.inspect(value => {
                        const promise = Result.fromAsync(async () => {
                            const globalResult = await this.container.stores.get("preconditions").interactionHandlerRun(interaction, handler);
                            if (globalResult.isErr()) {
                                this.container.client.emit(Events.InteractionHandlerDenied, globalResult.unwrapErr(), { interaction, handler });
                                return;
                            }

                            const localResult = await handler.preconditions.interactionHandlerRun(interaction, handler);
                            if (localResult.isErr()) {
                                this.container.client.emit(Events.InteractionHandlerDenied, localResult.unwrapErr(), { interaction, handler });
                                return;
                            }
                            handler.run(interaction, value);
                        })
                            .then(res => res.mapErr(error => ({ handler, error })));

                        promises.push(promise);
                    });
                },
                err: error => {
                    this.container.client.emit(Events.InteractionHandlerParseError, error, { interaction, handler });
                }
            });
        }

        if (promises.length === 0) return false;

        const results = await Promise.allSettled(promises);

        for (const result of results) {
            const res = (
                result as PromiseFulfilledResult<Result<unknown, { error: Error; handler: InteractionHandler } >>
            ).value;

            res.inspectErr(value => this.container.client.emit(Events.InteractionHandlerError, value.error, { interaction, handler: value.handler }));
        }


        return true;
    }
}
