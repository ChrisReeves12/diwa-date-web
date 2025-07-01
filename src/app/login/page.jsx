"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = LoginPage;
const site_wrapper_1 = __importDefault(require("@/common/site-wrapper/site-wrapper"));
const login_form_1 = __importDefault(require("./login-form"));
exports.metadata = {
    title: `${process.env.APP_NAME} | Sign In`,
};
function LoginPage() {
    return (<site_wrapper_1.default>
            <login_form_1.default />
        </site_wrapper_1.default>);
}
//# sourceMappingURL=page.jsx.map