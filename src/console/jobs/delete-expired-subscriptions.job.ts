import EvalUserSubscriptionsCommand from "../commands/eval-user-subscription.command";
import * as Sentry from "@sentry/nextjs";

// Mock Command class to simulate command line execution
class MockCommand {
    opts() {
        return {};
    }
}

async function main() {
    console.log('Starting expired subscription cleanup job...');

    while (true) {
        try {
            const command = new EvalUserSubscriptionsCommand();
            await command.handle(new MockCommand() as any);
        } catch (error) {
            console.error('An error occurred during expired subscription cleanup job:', error);
            Sentry.logger.error('Error during expired subscription cleanup job:', { error });
        }

        await new Promise(resolve => setTimeout(resolve, 7200000)); // 2 hours = 7200000 ms
    }
}

// Execute the main function when the script is run
main().catch(console.error);
