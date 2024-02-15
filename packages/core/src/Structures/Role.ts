import type { roles } from "@nezuchan/kanao-schema";
import { PermissionFlagsBits } from "discord-api-types/v10";
import type { InferSelectModel } from "drizzle-orm";
import { Base } from "./Base.js";
import { PermissionsBitField } from "./PermissionsBitField.js";

export class Role extends Base<InferSelectModel<typeof roles>> {
    public get name(): string {
        return this.data.name!;
    }

    public get permissions(): PermissionsBitField {
        return new PermissionsBitField(PermissionFlagsBits, BigInt(this.data.permissions ?? 0));
    }

    public get position(): number {
        return this.data.position!;
    }

    public toString(): string {
        return `<@&${this.id}>`;
    }
}
