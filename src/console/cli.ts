import SuspendUserCommand from "./commands/suspend-user.command";
import SeedUsersCommand from "./commands/seed-users.command";
import TestDeleteAccountCommand from "./commands/test-delete-account.command";
import EvalUserSubscriptionsCommand from "./commands/eval-user-subscription.command";
import ReviewUserProfileCommand from "./commands/review-user-profile.command";

export async function executeCommand(aCommand?: string) {
    const commands: Record<string, any> = {
        'users:suspend': SuspendUserCommand,
        'users:seed': SeedUsersCommand,
        'users:evaluate-subscriptions': EvalUserSubscriptionsCommand,
        'users:review': ReviewUserProfileCommand,
        'test:delete-account': TestDeleteAccountCommand,
    };

    // Show command list
    if (!aCommand) {
        if (!process.argv[2]) {
            console.log('Commands Available:');
            console.log('=================================');
            console.log('');

            for (const command in commands) {
                if (!Object.prototype.hasOwnProperty.call(commands, command)) continue;

                const commandClass = new commands[command]();
                console.log(`${command} - ${commandClass.description}`);
                console.log('');
            }
            return;
        }

        // Execute command
        if (!commands[process.argv[2]]) {
            console.error('This command is not supported.');
            return;
        }

        await new commands[process.argv[2]]().bootstrap(process.argv);
        return;
    }
}

executeCommand().then();
