"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SiteTopBar;
const link_1 = __importDefault(require("next/link"));
const image_1 = __importDefault(require("next/image"));
const navigation_1 = require("next/navigation");
require("./site-top-bar.scss");
const notification_center_1 = __importDefault(require("@/common/notification-center/notification-center"));
const current_user_context_1 = require("../context/current-user-context");
function SiteTopBar({ isLoginPage = false }) {
    const currentUser = (0, current_user_context_1.useCurrentUser)();
    const pathname = (0, navigation_1.usePathname)();
    return (<div className={`site-top-bar ${isLoginPage ? 'login' : ''}`}>
            <div className="logo-container">
                <link_1.default href="/">
                    <span className="light-dark">
                        <span className="light">
                            <image_1.default title="Diwa Date" alt="Logo" src="/images/full_logo.png" width={130} height={40} priority/>
                        </span>
                        <span className="dark">
                            <image_1.default title="Diwa Date" alt="Logo" src="/images/white_logo.png" width={130} height={40} priority/>
                        </span>
                    </span>
                </link_1.default>
            </div>
            {currentUser && <notification_center_1.default />}
            {!currentUser &&
            <div className="top-button-container">

                    {pathname !== '/registration' && pathname !== '/login' &&
                    <>
                            <link_1.default href="/login" className="top-button">Member Login</link_1.default>
                            <link_1.default href="/registration" className="top-button">Register</link_1.default>
                        </>}

                    {pathname === '/login' && <>
                        <link_1.default href="/" className="top-button">Back To Home</link_1.default>
                        <link_1.default href="/registration" className="top-button">Register</link_1.default>
                    </>}

                    {pathname === '/registration' && <>
                        <link_1.default href="/" className="top-button">Back To Home</link_1.default>
                        <link_1.default href="/login" className="top-button">Member Login</link_1.default>
                    </>}
                </div>}
        </div>);
}
//# sourceMappingURL=site-top-bar.jsx.map