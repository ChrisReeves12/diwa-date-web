"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardWrapper;
require("./dashboard-wrapper.scss");
const user_subscription_plan_display_1 = __importDefault(require("@/common/user-subscription-plan-display/user-subscription-plan-display"));
const current_user_context_1 = require("@/common/context/current-user-context");
const site_wrapper_1 = __importDefault(require("@/common/site-wrapper/site-wrapper"));
const tab_bar_1 = __importDefault(require("@/common/tab-bar/tab-bar"));
const react_1 = require("react");
const util_1 = require("@/util");
function DashboardWrapper({ currentUser, activeTab, children }) {
    const tabs = [
        { label: 'Search', url: '/', icon: 'las la-search', isSelected: activeTab === 'search' },
        { label: 'Likes', url: '/likes', icon: 'las la-heart', isSelected: activeTab === 'likes' },
        { label: 'Messages', url: '/messages', icon: 'las la-comments', isSelected: activeTab === 'messages' },
    ];
    (0, react_1.useEffect)(() => {
        (0, util_1.loadGoogleMapsScript)();
    }, []);
    return (<current_user_context_1.CurrentUserProvider currentUser={currentUser}>
            <site_wrapper_1.default>
                <div className="dashboard-wrapper-container">
                    <div className="container">
                        <user_subscription_plan_display_1.default />
                        <div className="dashboard-content-section">
                            <tab_bar_1.default tabs={tabs}/>
                            {children}
                        </div>
                    </div>
                </div>
            </site_wrapper_1.default>
        </current_user_context_1.CurrentUserProvider>);
}
//# sourceMappingURL=dashboard-wrapper.jsx.map