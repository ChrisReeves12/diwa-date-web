import ConsoleCommand from "./console.command";
import { Command } from "commander";
import { createUserSearchIndex } from "@/server-side-helpers/search.helpers";
import { businessConfig } from "@/config/business";

export default class CreateUserSearchIndexCommand extends ConsoleCommand {
    constructor() {
        super('search:create-user-index', 'Create the Elasticsearch user search index', []);
    }

    async handle(prog: Command): Promise<number> {
        console.log('Starting creation of Elasticsearch user search index...');
        
        try {
            const result = await createUserSearchIndex();
            
            if (result) {
                console.log(`Successfully created Elasticsearch user search index with max_result_window set to ${businessConfig.search.maxResultWindow}`);
                return 0;
            } else {
                console.error('Failed to create Elasticsearch user search index. Check the logs for more details.');
                return 1;
            }
        } catch (error) {
            console.error(`Error creating Elasticsearch user search index: ${error}`);
            return 1;
        }
    }
}