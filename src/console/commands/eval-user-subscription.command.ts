import ConsoleCommand from "@/console/commands/console.command";
import { Command } from "commander";

export default class EvalUserSubscriptionsCommand extends ConsoleCommand {
    constructor() {
        super('users:evaluate-subscriptions', 'Evaluate subscriptions for users and manage billing', [
            {
                option: '-u, --users <users>',
                description: 'Comma-delimited user IDs to process',
                required: false
            }
        ]);
    }

    handle(prog: Command): Promise<number> {
        throw new Error("Method not implemented.");
    }
}
