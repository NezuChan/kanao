import { BaseChannel } from "./BaseChannel.js";

export class VoiceChannel extends BaseChannel {
    public get bitrate(): number | undefined {
        return "bitrate" in this.data ? this.data.bitrate : undefined;
    }

    public get userLimit(): number | undefined {
        return "user_limit" in this.data ? this.data.user_limit : undefined;
    }
}
