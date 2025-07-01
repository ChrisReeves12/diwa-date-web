"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotificationIcon;
require("./notification-icon.scss");
const image_1 = __importDefault(require("next/image"));
function NotificationIcon({ lightIcon, darkIcon, title, alt, onClick, count, disabled = false, errorMessage, hasNewNotification = false }) {
    return (<div className="notification-icon-container">
            <button onClick={onClick} disabled={disabled} title={errorMessage || title}>
                <span className="light-dark">
                    <span className="light">
                        <image_1.default width={45} height={45} title={title} alt={alt} src={lightIcon}/>
                    </span>
                    <span className="dark">
                        <image_1.default width={45} height={45} title={title} alt={alt} src={darkIcon}/>
                    </span>
                </span>
                {!!count && count > 0 && (<div className={`notification-count-bubble ${hasNewNotification ? 'new-notification' : ''}`}>
                        {count > 99 ? '99+' : count}
                    </div>)}
            </button>
        </div>);
}
//# sourceMappingURL=notification-icon.jsx.map