import { PieceContext } from "@sapphire/pieces";
import { Listener } from "../../Stores/Listener.js";
import { Events } from "../../Utilities/EventEnums.js";
import { Message } from "@nezuchan/core";

export class PreMessageParsed extends Listener {
    public constructor(context: PieceContext) {
        super(context, {
            name: Events.PreMessageParsed
        });
    }

    public async run(message: Message): Promise<void> {
        if (message.author?.bot ?? message.webhookId) return;

        const mentionPrefix = await this.getMentionPrefix(message);
        let prefix: RegExp | string | null = null;

        if (mentionPrefix) {
            if (message.content.length === mentionPrefix.length) {
                this.container.client.emit(Events.MentionPrefixOnly, message);
                return;
            }

            prefix = mentionPrefix;
        } else if (this.container.client.options.regexPrefix?.test(message.content)) {
            prefix = this.container.client.options.regexPrefix;
        } else if (this.container.client.options.fetchPrefix) {
            const prefixes = await this.container.client.options.fetchPrefix(message.guildId, message.author?.id, message.channelId);
            const parsed = this.getPrefix(message.content, prefixes);
            if (parsed !== null) prefix = parsed;
        }

        if (prefix === null) this.container.client.emit(Events.NonPrefixedMessage, message);
        else this.container.client.emit(Events.PrefixedMessage, message, prefix);
    }

    private async getMentionPrefix(message: Message): Promise<string | null> {
        if (this.container.client.options.disableMentionPrefix) return null;
        if (message.content.length < 20 || !message.content.startsWith("<@")) return null;
        const me = await this.container.client.resolveUser({ cache: true, force: true, id: this.container.client.clientId });

        if (me) {
            if (message.content.startsWith(`<@!${me.id}>`)) return message.content.substring(0, me.id.length + 4);
            if (message.content.startsWith(`<@${me.id}>`)) return message.content.substring(0, me.id.length + 3);
        }

        return null;
    }

    private getPrefix(content: string, prefixes: string | readonly string[] | null): string | null {
        if (prefixes === null) return null;
        const { caseInsensitivePrefixes } = this.container.client.options;

        if (caseInsensitivePrefixes) content = content.toLowerCase();

        if (typeof prefixes === "string") {
            return content.startsWith(caseInsensitivePrefixes ? prefixes.toLowerCase() : prefixes) ? prefixes : null;
        }

        return prefixes.find(prefix => content.startsWith(caseInsensitivePrefixes ? prefix.toLowerCase() : prefix)) ?? null;
    }
}
