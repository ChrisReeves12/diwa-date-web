import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import RegistrationForm from "./registration-form";

export const metadata = {
    title: `${process.env.APP_NAME} | Registration`,
};

export default function Registration() {
    return (
        <SiteWrapper>
            <RegistrationForm />
        </SiteWrapper>
    );
}
