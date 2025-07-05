import VerifyEmail from "./verify";

export const metadata = {
    title: `${process.env.APP_NAME} | Verify Email`,
};


export default async function VerifyEmailPage({ searchParams }: any) {
    const lSearchParams = await searchParams;
    const { token } = lSearchParams;

    return <VerifyEmail token={token} />;
}