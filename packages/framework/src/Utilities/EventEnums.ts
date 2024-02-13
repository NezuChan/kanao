export enum ListenerEvents {
    ListenerError = "listenerError"
}

export enum Events {
    InteractionCreate = "interactionCreate",
    MessageCreate = "messageCreate",

    PreMessageParsed = "preMessageParsed",
    MentionPrefixOnly = "mentionPrefixOnly",
    NonPrefixedMessage = "nonPrefixedMessage",
    PrefixedMessage = "prefixedMessage",
    UnknownMessageCommandName = "unknownMessageCommandName",
    CommandDoesNotHaveMessageCommandHandler = "commandDoesNotHaveMessageCommandHandler",
    UnknownMessageCommand = "unknownMessageCommand",
    PreMessageCommandRun = "preMessageCommandRun",
    MessageCommandDisabled = "messageCommandDisabled",
    MessageCommandDenied = "messageCommandDenied",
    MessageCommandAccepted = "messageCommandAccepted",
    MessageCommandError = "messageCommandError",

    PossibleChatInputCommand = "possibleChatInputCommand",
    PossibleContextMenuCommand = "possibleContextMenuCommand",
    PossibleAutocompleteInteraction = "possibleAutoCompleteInteraction",

    PreChatInputCommandRun = "preChatInputCommandRun",
    ChatInputCommandAccepted = "chatInputCommandAccepted",
    ChatInputCommandError = "chatInputCommandError",
    ChatInputCommandDenied = "chatInputCommandDenied",
    ChatInputCommandDisabled = "chatInputCommandDisabled",

    PreContextMenuCommandRun = "preContextMenuCommandRun",
    ContextMenuCommandAccepted = "contextMenuCommandAccepted",
    ContextMenuCommandError = "contextMenuCommandError",
    ContextMenuCommandDenied = "contextMenuCommandDenied",
    ContextMenuCommandDisabled = "contextMenuCommandDisabled",

    PreContextCommandRun = "preContextCommandRun",
    ContextCommandAccepted = "contextCommandAccepted",
    ContextCommandError = "contextCommandError",
    ContextCommandDenied = "contextCommandDenied",

    CommandAutocompleteInteractionSuccess = "commandAutocompleteInteractionSuccess",
    CommandAutocompleteInteractionError = "commandAutocompleteInteractionError",

    InteractionHandlerError = "interactionHandlerError",
    InteractionHandlerParseError = "interactionHandlerParseError",
    InteractionHandlerDenied = "interactionHandlerDenied",

    RegisteringCommand = "registeringCommand",
    CommandRegistered = "commandRegistered",

    PluginLoaded = "pluginLoaded"
}
