import { BaseChannel } from "./BaseChannel.js";

export class TextChannel extends BaseChannel {
    public get nsfw(): boolean {
        return "nsfw" in this.data ? Boolean(this.data.nsfw) : false;
    }

    public get topic(): string | undefined {
        return "topic" in this.data ? this.data.topic ?? undefined : undefined;
    }
}
