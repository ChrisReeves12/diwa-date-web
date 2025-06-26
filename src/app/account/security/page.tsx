import '../account-settings.scss';
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { SecuritySettings } from "@/app/account/security/security-settings";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Account - Privacy & Security Settings`
    };
}

export default async function SecuritySettingsPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/');
    }

    return (
        <SecuritySettings currentUser={currentUser} />
    );
}
