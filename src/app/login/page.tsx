import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import LoginForm from './login-form';

export const metadata = {
    title: `${process.env.APP_NAME} | Sign In`,
};

export default function LoginPage() {
    return (
        <SiteWrapper hideFlashMessage={true}>
            <LoginForm />
        </SiteWrapper>
    );
}
