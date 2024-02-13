import { cast } from "@sapphire/utilities";
import { APIApplicationCommandInteractionDataOption, APIInteractionDataResolved, APIMessageApplicationCommandInteractionDataResolved, APIUserInteractionDataResolved, APIInteraction, ApplicationCommandOptionType, APIInteractionDataResolvedGuildMember, APIUser, APIRole, APIInteractionDataResolvedChannel } from "discord-api-types/v10";

export class CommandOptionsResolver {
    public subCommandName: string | null = null;
    public subCommandGroupName: string | null = null;
    public options!: APIApplicationCommandInteractionDataOption[];
    public resolvedOptions: APIInteractionDataResolved | APIMessageApplicationCommandInteractionDataResolved | APIUserInteractionDataResolved | undefined;

    public constructor(data: APIInteraction["data"]) {
        if (data && "resolved" in data) {
            this.resolvedOptions = data.resolved;
        }

        if (data && "options" in data) {
            this.options = data.options ?? [];
        } else {
            this.options = [];
        }

        if (this.options[0]?.type === ApplicationCommandOptionType.SubcommandGroup) {
            this.subCommandGroupName = this.options[0].name;
            this.options = this.options[0].options;
        }

        if (this.options[0]?.type === ApplicationCommandOptionType.Subcommand) {
            this.subCommandName = this.options[0].name;
            this.options = this.options[0].options ?? [];
        }
    }

    public get<T>(name: string, required?: boolean): T | null;
    public get<T>(name: string, required: true): T;
    public get<T>(name: string, required = false): T {
        const option = this.options.find(option => option.name === name);
        if (option) {
            if ("value" in option) return cast<T>(option.value);
        }
        if (required) throw new Error(`${name} is required, but it was missing.`);
        return cast<T>(null);
    }

    public getString(name: string, required?: boolean): string | null;
    public getString(name: string, required: true): string;
    public getString(name: string, required = false): string {
        const option = this.options.find(option => option.name === name && option.type === ApplicationCommandOptionType.String);
        if (option) {
            if ("value" in option) return cast<string>(option.value);
        }
        if (required) throw new Error(`${name} is required, but it was missing.`);
        return cast<string>(null);
    }

    public getNumber(name: string, required?: boolean): number | null;
    public getNumber(name: string, required: true): number;
    public getNumber(name: string, required = false): number {
        const option = this.options.find(option => option.name === name && option.type === ApplicationCommandOptionType.Number);
        if (option) {
            if ("value" in option) return cast<number>(option.value);
        }
        if (required) throw new Error(`${name} is required, but it was missing.`);
        return cast<number>(null);
    }

    public getInteger(name: string, required?: boolean): number | null;
    public getInteger(name: string, required: true): number;
    public getInteger(name: string, required = false): number {
        const option = this.options.find(option => option.name === name && option.type === ApplicationCommandOptionType.Integer);
        if (option) {
            if ("value" in option) return cast<number>(option.value);
        }
        if (required) throw new Error(`${name} is required, but it was missing.`);
        return cast<number>(null);
    }

    public getMember(name: string, required?: boolean): APIInteractionDataResolvedGuildMember | null;
    public getMember(name: string, required: true): APIInteractionDataResolvedGuildMember;
    public getMember(name: string, required = false): APIInteractionDataResolvedGuildMember {
        const option = this.options.find(option => option.name === name && option.type === ApplicationCommandOptionType.User);
        if (option) {
            if ("value" in option && this.resolvedOptions && "members" in this.resolvedOptions && this.resolvedOptions.members) return this.resolvedOptions.members[cast<string>(option.value)];
        }
        if (required) throw new Error("member is required, but it was missing.");
        return cast<APIInteractionDataResolvedGuildMember>(null);
    }

    public getUser(name: string, required?: boolean): APIUser | null;
    public getUser(name: string, required: true): APIUser;
    public getUser(name: string, required = false): APIUser {
        const option = this.options.find(option => option.name === name && option.type === ApplicationCommandOptionType.User);
        if (option) {
            if ("value" in option && this.resolvedOptions && "users" in this.resolvedOptions && this.resolvedOptions.users) return this.resolvedOptions.users[cast<string>(option.value)];
        }
        if (required) throw new Error("user is required, but it was missing.");
        return cast<APIUser>(null);
    }

    public getRole(name: string, required?: boolean): APIRole | null;
    public getRole(name: string, required: true): APIRole;
    public getRole(name: string, required = false): APIRole {
        const option = this.options.find(option => option.name === name && option.type === ApplicationCommandOptionType.Role);
        if (option) {
            if ("value" in option && this.resolvedOptions && "roles" in this.resolvedOptions && this.resolvedOptions.roles) return this.resolvedOptions.roles[cast<string>(option.value)];
        }
        if (required) throw new Error("role is required, but it was missing.");
        return cast<APIRole>(null);
    }

    public getChannel(name: string, required?: boolean): APIInteractionDataResolvedChannel | null;
    public getChannel(name: string, required: true): APIInteractionDataResolvedChannel;
    public getChannel(name: string, required = false): APIInteractionDataResolvedChannel {
        const option = this.options.find(option => option.name === name && option.type === ApplicationCommandOptionType.Channel);
        if (option) {
            if ("value" in option && this.resolvedOptions && "channels" in this.resolvedOptions && this.resolvedOptions.channels) return this.resolvedOptions.channels[cast<string>(option.value)];
        }
        if (required) throw new Error("channel is required, but it was missing.");
        return cast<APIInteractionDataResolvedChannel>(null);
    }

    public getFocused(name: string): Focused {
        const option = this.options.find(option => "focused" in option && option.focused);
        if (option && "focused" in option && option.focused && option.name === name) return { focused: true, value: String(option.value) };
        return { focused: false, value: null };
    }
}

export interface Focused {
    focused: boolean;
    value: string | null;
}
