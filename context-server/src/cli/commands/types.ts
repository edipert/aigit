export type CommandArgs = string[];

export interface CommandContext {
    args: CommandArgs;
    workspacePath: string;
    command: string;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;
