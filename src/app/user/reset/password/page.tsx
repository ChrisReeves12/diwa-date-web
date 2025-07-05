import './password-reset.scss';
import { PasswordReset } from "@/app/user/reset/password/password-reset";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import { redirect } from "next/navigation";
import { findUserByPasswordResetToken, getCurrentUser } from "@/server-side-helpers/user.helpers";
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata = {
    title: `${process.env.APP_NAME} | Password Reset`,
};

export default async function PasswordResetPage({ searchParams }: any) {
    const lSearchParams = await searchParams;
    const { token } = lSearchParams;

    // Check if user is already logged in
    const cookieStore = await cookies();
    const currentUser = await getCurrentUser(cookieStore);

    if (currentUser) {
        return redirect('/');
    }

    // If no token, show email entry form
    if (!token) {
        return (
            <SiteWrapper hideButtons={true}>
                <PasswordReset />
            </SiteWrapper>
        );
    }

    // Find user by token
    const user = await findUserByPasswordResetToken(token);
    if (!user) {
        return (
            <SiteWrapper hideButtons={true}>
                <div className="container">
                    <p style={{ textAlign: 'center', paddingTop: 20 }}>
                        Your password reset token has expired or is invalid. Please try again.<br />
                        Return to <Link href={'/'}>home page</Link>.
                    </p>
                </div>
            </SiteWrapper>
        );
    }

    return (
        <SiteWrapper hideButtons={true}>
            <PasswordReset token={token} />
        </SiteWrapper>
    );
} 