import ConsoleCommand from "@/console/commands/console.command";
import { pgDbReadPool, pgDbWritePool } from "@/lib/postgres";
import { Command } from "commander";
import { cancelPayPalSubscription } from "@/server-side-helpers/paypal.helpers";

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

    async handle(prog: Command): Promise<number> {
        const batchSize = 1000;

        while (true) {
            const users = await pgDbReadPool.query(
                `SELECT DISTINCT ON (u.id)
                    spe."id" as "enrollmentId",  
                    spe."paypalSubscriptionId",
                    u."id",
                    u."email"
                FROM "users" u 
                INNER JOIN "subscriptionPlanEnrollments" spe ON u.id = spe."userId"
                WHERE spe."endsAt" IS NOT NULL AND DATE(spe."endsAt") <= CURRENT_DATE
                LIMIT ${batchSize}`,
            );

            if (users.rows.length === 0) {
                break;
            }

            for (const user of users.rows) {
                console.log(`Deleting subscription for user ${user.id} (${user.email})`);

                // Cancel PayPal subscription if one exists
                if (user.paypalSubscriptionId) {
                    console.log(`Canceling PayPal subscription ${user.paypalSubscriptionId} for user ${user.id}`);
                    const result = await cancelPayPalSubscription(
                        user.paypalSubscriptionId,
                        'Subscription expired'
                    );

                    if (!result.success) {
                        console.error(`Failed to cancel PayPal subscription: ${result.error}`);
                        // Continue with deletion even if PayPal cancellation fails
                    } else {
                        console.log(`Successfully canceled PayPal subscription ${user.paypalSubscriptionId}`);
                    }
                }

                await pgDbWritePool.query(`DELETE FROM "subscriptionPlanEnrollments" WHERE "id" = $1`, [user.enrollmentId]);
                await pgDbWritePool.query(`UPDATE "users" SET "isPremium" = false, "updatedAt" = NOW() WHERE "id" = $1`, [user.id]);
            }
        }

        return 0;
    }
}
