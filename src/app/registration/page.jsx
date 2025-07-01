"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = Registration;
const site_wrapper_1 = __importDefault(require("@/common/site-wrapper/site-wrapper"));
const registration_form_1 = __importDefault(require("./registration-form"));
const react_1 = require("react");
exports.metadata = {
    title: `${process.env.APP_NAME} | Registration`,
};
function Registration() {
    return (<site_wrapper_1.default>
            <react_1.Suspense>
                <registration_form_1.default />
            </react_1.Suspense>
        </site_wrapper_1.default>);
}
//# sourceMappingURL=page.jsx.map