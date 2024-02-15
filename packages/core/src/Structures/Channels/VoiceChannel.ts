import { BaseChannel } from "./BaseChannel.js";

export class VoiceChannel extends BaseChannel {
    public get bitrate(): number | null | undefined {
        return this.data.bitrate;
    }

    public get userLimit(): number | null | undefined {
        return this.data.userLimit;
    }
}
