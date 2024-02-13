import { Snowflake } from "discord-api-types/v10";
import { Client } from "./Client.js";

export class Base<RawType> {
    public constructor(
        protected readonly data: RawType & { id: Snowflake; guild_id?: Snowflake },
        public client: Client
    ) {
    }

    public get id(): string {
        return this.data.id;
    }

    public toJSON(): unknown {
        return {
            id: this.id
        };
    }
}
