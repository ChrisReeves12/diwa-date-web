import ConsoleCommand from "./console.command";
import { Command } from "commander";
import prisma from "@/lib/prisma";
import { indexUserForSearch } from "@/server-side-helpers/search.helpers";
import { User } from "@/types";

export default class IndexUsersCommand extends ConsoleCommand {
    constructor() {
        super('search:index-users', 'Index users for search functionality', [
            {
                option: '-u, --users <users>',
                description: 'Comma-delimited list of user emails to index.',
                required: false
            },
        ]);
    }

    async handle(prog: Command): Promise<number> {
        console.log('Starting user indexing process...');
        const options = prog.options;
        const usersToIndex = prog.opts().users?.split(',').filter(Boolean) || [];

        if (usersToIndex.length > 0) {
            console.log(`Indexing specific users: ${usersToIndex.join(', ')}`);

            // Get users by ids
            const users = await prisma.users.findMany({
                where: {
                    id: {
                        in: usersToIndex.map((id: string) => BigInt(id))
                    }
                }
            });

            if (users.length === 0) {
                console.log('No users found with the provided ids.');
                return 0;
            }

            console.log(`Found ${users.length} users to index.`);

            for (const user of users) {
                const result = await indexUserForSearch(user as unknown as User);
                if (result) {
                    console.log(`Indexed user: ${user.email}`);
                } else {
                    console.log(`Failed to index user: ${user.email}`);
                }
            }

            console.log('Finished indexing specific users.');
            return 0;
        }

        // If no specific users provided, index all users
        console.log('Indexing all users...');
        const batchSize = 100000;
        let offset = 0;
        let totalIndexed = 0;

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
                    totalIndexed++;
                }
            }

            offset += batchSize;
        }

        console.log(`Finished indexing all users. Total indexed: ${totalIndexed}`);
        return 0;
    }
}
