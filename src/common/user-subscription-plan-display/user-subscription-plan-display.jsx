"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserSubscriptionPlanDisplay;
require("./user-subscription-plan-display.scss");
const current_user_context_1 = require("@/common/context/current-user-context");
function UserSubscriptionPlanDisplay() {
    const currentUser = (0, current_user_context_1.useCurrentUser)();
    if (!currentUser) {
        return null;
    }
    return (<div className="subscription-plan-display-container">
            <div className="label">My Subscription Level:</div>
            <div className="subscription-level">{currentUser.isSubscriptionActive ? 'Premium' : 'Free'} Member</div>
        </div>);
}
//# sourceMappingURL=user-subscription-plan-display.jsx.map