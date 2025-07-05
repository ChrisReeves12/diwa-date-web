import './reset-email.scss';
import { ResetEmail } from "@/app/user/reset/email/reset-email";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import { redirect } from "next/navigation";
import { findUserByResetToken } from "@/server-side-helpers/user.helpers";
import Link from 'next/link';

export const metadata = {
    title: `${process.env.APP_NAME} | Email Reset`,
};

export default async function ResetEmailPage({ searchParams }: any) {

    const lSearchParams = await searchParams;
    const { token } = lSearchParams;

    if (!token) {
        return redirect('/');
    }

    // Find user by token
    const user = await findUserByResetToken(token);
    if (!user) {
        return (
            <SiteWrapper hideButtons={true}>
                <div className="container">
                    <p style={{ textAlign: 'center', paddingTop: 20 }}>Your email reset token has expired, please try again.<br />Return to <Link href={'/'}>home page</Link>.</p>
                </div>
            </SiteWrapper>
        );
    }

    if (!user.newDesiredEmail) {
        return redirect('/');
    }

    return (
        <SiteWrapper hideButtons={true}>
            <ResetEmail token={token} newEmail={user.newDesiredEmail!} />
        </SiteWrapper>
    );
}
