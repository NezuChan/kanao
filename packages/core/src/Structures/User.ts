import type { ImageURLOptions } from "@discordjs/rest";
import type { users } from "@nezuchan/kanao-schema";
import { DiscordSnowflake } from "@sapphire/snowflake";
import type { InferSelectModel } from "drizzle-orm";
import { Base } from "./Base.js";

export class User extends Base<Partial<InferSelectModel<typeof users>>> {
    public get username(): string | undefined {
        return this.data.username;
    }

    public get discriminator(): string | null | undefined {
        return this.data.discriminator;
    }

    public get avatar(): string | null | undefined {
        return this.data.avatar;
    }

    public get bot(): boolean {
        return Boolean(this.data.bot);
    }

    public get accentColor(): number | null | undefined {
        return this.data.accentColor;
    }

    public get banner(): string | null | undefined {
        return this.data.banner;
    }

    public get tag(): string {
        return `${this.username}${this.discriminator === "0" ? "" : `#${this.discriminator}`}`;
    }

    public get createdTimestamp(): number {
        return DiscordSnowflake.timestampFrom(this.id);
    }

    public get createdAt(): Date {
        return new Date(this.createdTimestamp);
    }

    public get defaultAvatarURL(): string {
        return this.client.rest.cdn.defaultAvatar(Number(this.discriminator) % 5);
    }

    public avatarURL(options?: ImageURLOptions): string | null {
        return this.avatar ? this.client.rest.cdn.avatar(this.id, this.avatar, options) : null;
    }

    public displayAvatarURL(options?: ImageURLOptions): string {
        return this.avatarURL(options) ?? this.defaultAvatarURL;
    }

    public bannerURL(options?: ImageURLOptions): string | null {
        return this.banner ? this.client.rest.cdn.banner(this.id, this.banner, options) : null;
    }

    public toString(): string {
        return `<@${this.id}>`;
    }
}
