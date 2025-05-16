import ConsoleCommand from "./console.command";
import { Command } from "commander";
import { updateElasticsearchMaxResultWindow } from "@/server-side-helpers/search.helpers";
import { businessConfig } from "@/config/business";

export default class UpdateElasticsearchWindowCommand extends ConsoleCommand {
    constructor() {
        super('search:update-window', 'Update Elasticsearch max result window', [
            {
                option: '-w, --window <window>',
                description: `The new maximum window size (defaults to ${businessConfig.search.maxResultWindow}).`,
                required: false
            }
        ]);
    }

    async handle(prog: Command): Promise<number> {
        console.log('Starting Elasticsearch max result window update...');
        const options = prog.opts();
        const windowSize = options.window ? parseInt(options.window, 10) : businessConfig.search.maxResultWindow;

        if (isNaN(windowSize) || windowSize <= 0) {
            console.error('Window size must be a positive number');
            return 1;
        }

        console.log(`Setting max_result_window to ${windowSize}...`);

        try {
            const result = await updateElasticsearchMaxResultWindow(windowSize);

            if (result) {
                console.log(`Successfully updated max_result_window to ${windowSize}`);
                return 0;
            } else {
                console.error('Failed to update max_result_window. Check the logs for more details.');
                return 1;
            }
        } catch (error) {
            console.error(`Error updating max_result_window: ${error}`);
            return 1;
        }
    }
}
