import { BaseChannel } from "./BaseChannel.js";

export class TextChannel extends BaseChannel {
    public get nsfw(): boolean {
        return Boolean(this.data.nsfw);
    }

    public get topic(): string | null | undefined {
        return this.data.topic;
    }
}
