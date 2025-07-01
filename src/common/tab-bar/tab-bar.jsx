"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TabBar;
require("./tab-bar.scss");
const link_1 = __importDefault(require("next/link"));
function TabBar({ tabs }) {
    return (<div className="tab-bar-container">
            {tabs.map(tab => (<link_1.default href={tab.url} key={tab.label}>
                    <div className={`tab ${tab.isSelected ? 'selected' : ''}`}>
                        <i className={tab.icon}></i>
                        <span className="label">{tab.label}</span>
                    </div>
                </link_1.default>))}
        </div>);
}
//# sourceMappingURL=tab-bar.jsx.map