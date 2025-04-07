import ConsoleCommand from "./console.command";
import { Command } from "commander";
import prisma from "@/lib/prisma";
import { indexUserForSearch } from "@/server-side-helpers/search.helpers";
import { User } from "@/types";

export default class IndexUsersCommand extends ConsoleCommand {
    constructor() {
        super('search:index-users', 'Index users for search functionality');
    }

    async handle(prog: Command): Promise<number> {
        console.log('Starting user indexing process...');
        const batchSize = 100000;
        let offset = 0;

        while (true) {
            const users = await prisma.users.findMany({
                take: batchSize,
                skip: offset
            });

            if (users.length === 0) {
                break;
            }

            for (const user of users) {
                const result = await indexUserForSearch(user as unknown as User);
                if (result) {
                    console.log(`Indexed user: ${user.email}...`);
                }
            }

            offset += batchSize;
        }

        return 0;
    }
}
