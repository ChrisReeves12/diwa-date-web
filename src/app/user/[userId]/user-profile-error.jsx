"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserProfileError;
const site_top_bar_1 = __importDefault(require("@/common/site-top-bar/site-top-bar"));
const current_user_context_1 = require("@/common/context/current-user-context");
function UserProfileError({ children, currentUser }) {
    return (<current_user_context_1.CurrentUserProvider currentUser={currentUser}>
            <site_top_bar_1.default />
            <div className="error-notification-section">
                {children}
            </div>
        </current_user_context_1.CurrentUserProvider>);
}
//# sourceMappingURL=user-profile-error.jsx.map