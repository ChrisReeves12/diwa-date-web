"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotificationPopover;
const material_1 = require("@mui/material");
const notification_menu_1 = __importDefault(require("@/common/notification-center/notification-menu/notification-menu"));
function NotificationPopover({ id, anchorEl, open, onClose, titleIcon, titleIconDark, title, listItems }) {
    return (<material_1.Popover anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} id={id} anchorEl={anchorEl} onClose={onClose} open={open}>
            <notification_menu_1.default titleIcon={titleIcon} titleIconDark={titleIconDark} title={title} listItems={listItems}/>
        </material_1.Popover>);
}
//# sourceMappingURL=notification-popover.jsx.map