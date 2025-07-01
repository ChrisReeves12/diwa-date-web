"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = BillingInformationPage;
require("../account-settings.scss");
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const headers_1 = require("next/headers");
const navigation_1 = require("next/navigation");
const billing_information_1 = require("@/app/account/billing/billing-information");
async function generateMetadata() {
    return {
        title: `${process.env.APP_NAME} | Account - Billing Information`
    };
}
async function BillingInformationPage() {
    const currentUser = await (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
    if (!currentUser) {
        (0, navigation_1.redirect)('/');
    }
    return (<billing_information_1.BillingInformation currentUser={currentUser}/>);
}
//# sourceMappingURL=page.jsx.map