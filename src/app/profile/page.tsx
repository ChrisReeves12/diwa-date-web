import './profile-settings.scss';
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/app/profile/profile-settings";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Profile Settings`
    };
}

export default async function ProfileSettingsPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/profile');
    }

    return (
        <ProfileSettings currentUser={currentUser} />
    );
}
