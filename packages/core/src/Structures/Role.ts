import { APIRole, PermissionFlagsBits } from "discord-api-types/v10";
import { Base } from "./Base.js";
import { PermissionsBitField } from "./PermissionsBitField.js";

export class Role extends Base<APIRole> {
    public get name(): string {
        return this.data.name;
    }

    public get permissions(): PermissionsBitField {
        return new PermissionsBitField(PermissionFlagsBits, BigInt(this.data.permissions));
    }

    public get managed(): boolean {
        return this.data.managed;
    }

    public get mentionable(): boolean {
        return this.data.mentionable;
    }

    public get position(): number {
        return this.data.position;
    }

    public toString(): string {
        return `<@&${this.id}>`;
    }
}
