import { BitField, BitFieldResolvable } from "@cordis/bitfield";
import { PermissionFlagsBits } from "discord-api-types/v10";

export class PermissionsBitField extends BitField<string> {
    public missing(bit: BitFieldResolvable<string>, checkAdmin = true): (BitField<string> | bigint | string)[] {
        return checkAdmin && this.has(PermissionFlagsBits.Administrator) ? [] : super.missing(bit);
    }

    public any(bit: BitFieldResolvable<string>, checkAdmin = true): boolean {
        return (checkAdmin && super.has(PermissionFlagsBits.Administrator)) || super.any(bit);
    }

    public has(bit: BitFieldResolvable<string>, checkAdmin = true): boolean {
        return (checkAdmin && super.has(PermissionFlagsBits.Administrator)) || super.has(bit);
    }
}
