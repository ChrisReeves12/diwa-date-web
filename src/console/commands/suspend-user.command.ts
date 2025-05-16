import ConsoleCommand from "./console.command";
import { Command } from "commander";
import { suspendUser } from "@/server-side-helpers/user.helpers";

export default class SuspendUserCommand extends ConsoleCommand {
    constructor() {
        super('users:suspend', 'Suspend or unsuspend users', [
            {
                option: '-u, --user <users>',
                description: 'Comma-delimited list of user IDs to suspend or unsuspend.',
                required: true
            },
            {
                option: '--unsuspend',
                description: 'Unsuspend the user(s) instead of suspending them.',
                required: false
            }
        ]);
    }

    async handle(prog: Command): Promise<number> {
        const options = prog.opts();
        const usersToProcess = options.user.split(',').filter(Boolean);
        const shouldUnsuspend = options.unsuspend || false;
        const action = shouldUnsuspend ? 'unsuspending' : 'suspending';

        if (usersToProcess.length === 0) {
            console.log('No user IDs provided.');
            return 1;
        }

        console.log(`Starting ${action} process for user(s): ${usersToProcess.join(', ')}`);

        let successCount = 0;
        let failCount = 0;

        for (const userId of usersToProcess) {
            try {
                const userIdNum = Number(userId);
                const result = await suspendUser(userIdNum, !shouldUnsuspend);
                
                if (result) {
                    console.log(`Successfully ${shouldUnsuspend ? 'unsuspended' : 'suspended'} user: ${userId}`);
                    successCount++;
                } else {
                    console.error(`Failed to ${shouldUnsuspend ? 'unsuspend' : 'suspend'} user: ${userId}`);
                    failCount++;
                }
            } catch (error) {
                console.error(`Error processing user ${userId}: ${error}`);
                failCount++;
            }
        }

        console.log(`Process complete. ${successCount} user(s) successfully ${shouldUnsuspend ? 'unsuspended' : 'suspended'}, ${failCount} failed.`);
        return failCount > 0 ? 1 : 0;
    }
}