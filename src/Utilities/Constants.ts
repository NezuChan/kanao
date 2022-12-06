/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class Constants {
    public static EXCHANGE = "gateway";
    public static QUEUE_RECV = "gateway.recv";
    public static QUEUE_SEND = "gateway.send";

    public static SESSIONS_KEY = "gateway_sessions";
    public static STATUSES_KEY = "gateway_statuses";
    public static STARTED_KEY = "gateway_started";
    public static SHARDS_KEY = "gateway_shards";

    public static BOT_USER_KEY = "bot_user";
    public static GUILD_KEY = "guild";
    public static CHANNEL_KEY = "channel";
    public static MESSAGE_KEY = "MESSAGE_KEY";
    public static ROLE_KEY = "role";
    public static EMOJI_KEY = "emoji";
    public static MEMBER_KEY = "member";
    public static PRESENCE_KEY = "presence";
    public static VOICE_KEY = "voice";

    public static KEYS_SUFFIX = "_keys";
    public static EXPIRY_KEYS = "expiry_keys";

    public static readonly TASKS_SEND = "scheduled-tasks.send";
    public static readonly TASKS_RECV = "scheduled-tasks.recv";

    public static guild_key(id: string): string {
        return `${Constants.GUILD_KEY}:${id}`;
    }

    public static channel_key(id: string, guildId: string): string {
        return `${Constants.CHANNEL_KEY}:${guildId}:${id}`;
    }

    public static private_channel_key(id: string): string {
        return `${Constants.CHANNEL_KEY}:${id}`;
    }

    public static message_key(id: string): string {
        return `${Constants.MESSAGE_KEY}:${id}`;
    }

    public static role_key(id: string, guildId: string): string {
        return `${Constants.ROLE_KEY}:${guildId}:${id}`;
    }

    public static emoji_key(id: string, guildId: string): string {
        return `${Constants.EMOJI_KEY}:${guildId}:${id}`;
    }

    public static member_key(id: string, guildId: string): string {
        return `${Constants.MEMBER_KEY}:${guildId}:${id}`;
    }

    public static presence_key(id: string, guildId: string): string {
        return `${Constants.PRESENCE_KEY}:${guildId}:${id}`;
    }

    public static voice_key(id: string, guildId: string): string {
        return `${Constants.VOICE_KEY}:${guildId}:${id}`;
    }
}
