"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SiteWrapper;
const site_top_bar_1 = __importDefault(require("../site-top-bar/site-top-bar"));
require("./site-wrapper.scss");
function SiteWrapper({ children }) {
    return (<div className="site-wrapper">
            <site_top_bar_1.default />
            {children}
        </div>);
}
//# sourceMappingURL=site-wrapper.jsx.map