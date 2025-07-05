'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifyEmail({ token }: { token: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | undefined>();

    useEffect(() => {
        fetch('/user/verify/email/backend', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token })
        }).then((res) => {
            if (res.status === 200) {
                window.localStorage.setItem('FlashSuccessMessage', 'Your email has successfully been verified.');
            } else {
                window.localStorage.setItem('FlashWarningMessage', 'Your email verification token was invalid or has expired. Try resending the verification email again.');
            }

            router.replace('/');
        });
    }, [token, router]);

    return <></>;
}