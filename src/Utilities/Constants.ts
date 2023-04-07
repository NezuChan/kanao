/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class Constants {
    public static EXCHANGE = "nezu-gateway";
    public static QUEUE_RECV = "nezu-gateway.recv";
    public static QUEUE_SEND = "nezu-gateway.send";

    public static SESSIONS_KEY = "gateway_sessions";
    public static STATUSES_KEY = "gateway_statuses";
    public static STARTED_KEY = "gateway_started";
    public static SHARDS_KEY = "gateway_shards";

    public static BOT_USER_KEY = "bot_user";
    public static GUILD_KEY = "guild";
    public static CHANNEL_KEY = "channel";
    public static MESSAGE_KEY = "message";
    public static ROLE_KEY = "role";
    public static EMOJI_KEY = "emoji";
    public static MEMBER_KEY = "member";
    public static PRESENCE_KEY = "presence";
    public static VOICE_KEY = "voice";
    public static USER_KEY = "user";

    public static KEYS_SUFFIX = "_keys";
    public static EXPIRY_KEYS = "expiry_keys";
}
