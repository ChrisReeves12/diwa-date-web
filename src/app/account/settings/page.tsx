import '../account-settings.scss';
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { GeneralSettings } from "@/app/account/settings/general-settings";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Account - General Settings`
    };
}

export default async function GeneralSettingsPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/account/settings');
    }

    return (
        <GeneralSettings currentUser={currentUser} />
    );
}
