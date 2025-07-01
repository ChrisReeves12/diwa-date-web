"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginForm;
require("./login.scss");
const react_1 = __importStar(require("react"));
const navigation_1 = require("next/navigation");
const image_1 = __importDefault(require("next/image"));
const login_content_1 = require("@/content/login-content");
const login_actions_1 = require("./login.actions");
function LoginForm() {
    const router = (0, navigation_1.useRouter)();
    const [email, setEmail] = (0, react_1.useState)('chris.reeves1230@gmail.com');
    const [password, setPassword] = (0, react_1.useState)('Rulatia12!');
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [errors, setErrors] = (0, react_1.useState)({});
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const handleSubmit = async (formData) => {
        setErrors({});
        setIsLoading(true);
        try {
            // Add email and password to the form data
            formData.set('email', email);
            formData.set('password', password);
            // Call the server action
            const result = await (0, login_actions_1.loginAction)(formData);
            if (!result.success) {
                // Authentication failed
                setErrors({
                    form: result.message || 'Invalid email or password'
                });
                return;
            }
            // Login successful
            router.push('/');
            router.refresh();
        }
        catch (error) {
            console.error('Login error:', error);
            setErrors({
                form: 'An unexpected error occurred'
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };
    return (<div className="login-site-container">
            <div className="container">
                <div className="form-container">
                    <div className="form-section">
                        <div className="logo-container">
                            <image_1.default src="/images/blue_background_icon_logo.png" alt="Logo" width={80} height={80} priority/>
                        </div>
                        <h1>{login_content_1.loginTitle}</h1>
                        <h4>{login_content_1.loginSubtitle}</h4>
                        <form action={handleSubmit}>
                            <div className="form-row">
                                <div className={`input-container ${errors.email ? 'error' : ''}`}>
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? 'error' : ''} required/>
                                    {errors.email && (<div className="error-message">{errors.email}</div>)}
                                </div>
                            </div>

                            {errors.form && (<div className="form-row">
                                    <div className="error-message">{errors.form}</div>
                                </div>)}

                            <div className="form-row">
                                <div className={`input-container ${errors.password ? 'error' : ''}`}>
                                    <label htmlFor="password">Password</label>
                                    <div className="password-input-wrapper">
                                        <input type={showPassword ? "text" : "password"} id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} className={errors.password ? 'error' : ''} required/>
                                        <button type="button" className="password-toggle" onClick={togglePasswordVisibility} tabIndex={-1}>
                                            <i className={`las ${showPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                        </button>
                                    </div>
                                    {errors.password && (<div className="error-message">{errors.password}</div>)}
                                </div>
                            </div>

                            <div className="forgot-password-link">
                                <a href="/forgot-password">Forgot Password?</a>
                            </div>

                            <div className="submit-button-wrapper">
                                <div className="form-row form-row-loader-container">
                                    <button className="btn-primary" type="submit" disabled={isLoading}>
                                        Sign In
                                    </button>
                                    <div className={`loader ${isLoading ? 'is-loading' : ''}`}>
                                        <i className="las la-spinner"></i>
                                    </div>
                                </div>
                            </div>
                        </form>
                        <div className="register-link">
                            Don&apos;t have an account? <a href="/registration">Register</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>);
}
//# sourceMappingURL=login-form.jsx.map