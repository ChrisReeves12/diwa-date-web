import '../account-settings.scss';
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { BillingInformation } from "@/app/account/billing/billing-information";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Account - Premium Membership`
    };
}

export default async function BillingInformationPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/account/billing');
    }

    return (
        <BillingInformation currentUser={currentUser} />
    );
}
