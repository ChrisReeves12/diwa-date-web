import { NextRequest, NextResponse } from "next/server";
import { authAwareAPIRequest } from "@/server-side-helpers/api.helpers";
import { searchUsers } from "@/server-side-helpers/search.helpers";
import { SearchParameters } from "@/types/search-parameters.interface";
import { SearchResponse } from "@/types/search-response.interface";

export async function POST(request: NextRequest) {
    return authAwareAPIRequest(request, async (currentUser) => {
        const searchParams: SearchParameters = await request.json();
        const searchResults = await searchUsers(
            currentUser,
            searchParams
        );

        if (!searchResults) {
            throw new Error("An error occurred while searching for users.");
        }

        debugger;
        return NextResponse.json<SearchResponse>(searchResults);
    });
}
