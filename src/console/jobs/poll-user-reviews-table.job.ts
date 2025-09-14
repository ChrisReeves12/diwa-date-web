import ReviewUserProfileCommand from "../commands/review-user-profile.command";
import * as Sentry from "@sentry/nextjs";

// Mock Command class to simulate command line execution
class MockCommand {
    opts() {
        return {};
    }
}

async function main() {
    console.log('Starting user reviews polling job...');

    while (true) {
        try {
            const command = new ReviewUserProfileCommand();
            await command.handle(new MockCommand() as any);
        } catch (error) {
            console.error('An error occurred during user reviews polling job:', error);
            Sentry.logger.error('Error during batch user reviews polling job:', { error });
        }

        // Wait 5 seconds before next iteration
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Execute the main function when the script is run
main().catch(console.error);
