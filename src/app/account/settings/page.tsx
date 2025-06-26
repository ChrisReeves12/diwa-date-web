import '../account-settings.scss';
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserSettings } from "@/app/account/settings/user-settings";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Account - User Settings`
    };
}

export default async function UserSettingsPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/');
    }

    return (
        <UserSettings currentUser={currentUser} />
    );
}
