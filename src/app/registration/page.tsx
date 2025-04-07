import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import RegistrationForm from "./registration-form";
import { Suspense } from "react";

export const metadata = {
    title: `${process.env.APP_NAME} | Registration`,
};

export default function Registration() {
    return (
        <SiteWrapper>
            <Suspense>
                <RegistrationForm />
            </Suspense>
        </SiteWrapper>
    );
}
