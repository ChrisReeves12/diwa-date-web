import { NextRequest, NextResponse } from "next/server";
import { User } from "@/types";
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { logError } from "./logging.helpers";

/**
 * Surrounds a request in authentication layer.
 * @param request
 * @param action
 */
export async function authAwareAPIRequest<T>(request: NextRequest, action: (currentUser: User) =>
    Promise<NextResponse<T | { message: string }>>) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        return action(currentUser);
    } catch (err: any) {
        logError(err);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
