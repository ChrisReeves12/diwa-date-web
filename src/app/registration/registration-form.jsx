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
exports.default = RegistrationForm;
require("./registration.scss");
const react_1 = __importStar(require("react"));
const navigation_1 = require("next/navigation");
const seeking_match_form_1 = __importDefault(require("@/common/seeking-match-form/seeking-match-form"));
const registration_content_1 = require("@/content/registration-content");
const location_search_1 = __importDefault(require("@/common/location-search/location-search"));
const registration_form_actions_1 = require("./registration-form-actions");
function RegistrationForm() {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [firstName, setFirstName] = (0, react_1.useState)('');
    const [lastName, setLastName] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
    const [dateOfBirth, setDateOfBirth] = (0, react_1.useState)('');
    const [selectedLocation, setSelectedLocation] = (0, react_1.useState)();
    const [termsAccepted, setTermsAccepted] = (0, react_1.useState)(false);
    const [userGender, setUserGender] = (0, react_1.useState)(searchParams.get('userSex') || '');
    const [seekingGender, setSeekingGender] = (0, react_1.useState)(searchParams.get('userSexSeeking') || '');
    const [timezone, setTimezone] = (0, react_1.useState)('');
    // Form validation states
    const [errors, setErrors] = (0, react_1.useState)({});
    const [formSubmitted, setFormSubmitted] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        try {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setTimezone(detectedTimezone);
        }
        catch (error) {
            console.error('Error detecting timezone:', error);
            setTimezone('UTC');
        }
    }, []);
    // Calculate max date (18 years ago)
    const getMaxDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        return today.toISOString().split('T')[0];
    };
    // Validate form
    const validateForm = () => {
        const newErrors = {};
        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }
        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        }
        else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!password) {
            newErrors.password = 'Password is required';
        }
        else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }
        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!selectedLocation) {
            newErrors.location = 'Please search and select your location';
        }
        if (!dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        }
        else {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                if (age - 1 < 18) {
                    newErrors.dateOfBirth = 'You must be at least 18 years old';
                }
            }
            else if (age < 18) {
                newErrors.dateOfBirth = 'You must be at least 18 years old';
            }
        }
        if (!termsAccepted) {
            newErrors.terms = 'You must accept the terms of service';
        }
        if (!userGender) {
            newErrors.userGender = 'Please select your gender';
        }
        if (!seekingGender) {
            newErrors.seekingGender = 'Please select who you are looking for';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (formData) => {
        setFormSubmitted(true);
        // Return early if terms aren't accepted
        if (!termsAccepted) {
            setErrors({ terms: 'You must accept the terms of service' });
            return;
        }
        if (!validateForm()) {
            return;
        }
        setIsLoading(true);
        try {
            // Add form data fields
            formData.set('firstName', firstName);
            formData.set('lastName', lastName);
            formData.set('email', email);
            formData.set('password', password);
            formData.set('dateOfBirth', dateOfBirth);
            formData.set('location', JSON.stringify(selectedLocation));
            formData.set('userGender', userGender);
            formData.set('seekingGender', seekingGender);
            formData.set('termsAccepted', termsAccepted.toString());
            formData.set('timezone', timezone);
            // Call the server action
            const result = await (0, registration_form_actions_1.registerAction)(formData);
            if (result.success) {
                router.push('/');
            }
            else {
                if (result.errors) {
                    setErrors(result.errors);
                }
                else {
                    setErrors({ form: result.message || 'Registration failed' });
                }
            }
        }
        catch (error) {
            console.error('Registration error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="registration-site-container">
      <div className="container">
        <div className="form-container">
          <div className="form-section">
            <h1>{registration_content_1.registrationTitle}</h1>
            <h4>{registration_content_1.registrationSubtitle}</h4>
            <h5>
              Already have an account? <a href="/login">Login</a>
            </h5>
            <form action={handleSubmit}>
              <div className="registration-seeking-container">
                <div className="input-container">
                  <seeking_match_form_1.default initialUserSex={userGender} initialUserSexSeeking={seekingGender} onUpdate={(data) => {
            if (data.userSex)
                setUserGender(data.userSex);
            if (data.userSexSeeking)
                setSeekingGender(data.userSexSeeking);
        }}/>

                  {(errors.userGender || errors.seekingGender) && formSubmitted && (<div className="error-message">
                      {errors.userGender || errors.seekingGender}
                    </div>)}
                </div>
              </div>
              <div className="form-row">
                <div className={`input-container ${errors.firstName && formSubmitted ? 'error' : ''}`}>
                  <label htmlFor="firstName">First Name</label>
                  <input type="text" id="firstName" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={errors.firstName && formSubmitted ? 'error' : ''}/>
                  {errors.firstName && formSubmitted && (<div className="error-message">{errors.firstName}</div>)}
                </div>
              </div>

              <div className="form-row">
                <div className={`input-container ${errors.lastName && formSubmitted ? 'error' : ''}`}>
                  <label htmlFor="lastName">Last Name</label>
                  <input type="text" id="lastName" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={errors.lastName && formSubmitted ? 'error' : ''}/>
                  {errors.lastName && formSubmitted && (<div className="error-message">{errors.lastName}</div>)}
                </div>
              </div>

              <div className="form-row">
                <div className={`input-container ${errors.email && formSubmitted ? 'error' : ''}`}>
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email && formSubmitted ? 'error' : ''}/>
                  {errors.email && formSubmitted && (<div className="error-message">{errors.email}</div>)}
                </div>
              </div>

              <location_search_1.default onUpdate={(locality) => setSelectedLocation(locality)} error={formSubmitted && errors.location ? errors.location : undefined}/>

              <div className="form-row">
                <div className={`input-container ${errors.password && formSubmitted ? 'error' : ''}`}>
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} className={errors.password && formSubmitted ? 'error' : ''}/>
                  {errors.password && formSubmitted && (<div className="error-message">{errors.password}</div>)}
                  <div className="sub-label">{registration_content_1.registrationPasswordHint}</div>
                </div>
              </div>

              <div className="form-row">
                <div className={`input-container ${errors.confirmPassword && formSubmitted ? 'error' : ''}`}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={errors.confirmPassword && formSubmitted ? 'error' : ''}/>
                  {errors.confirmPassword && formSubmitted && (<div className="error-message">{errors.confirmPassword}</div>)}
                </div>
              </div>

              <div className="form-row">
                <div className={`input-container ${errors.dateOfBirth && formSubmitted ? 'error' : ''}`}>
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input type="date" id="dateOfBirth" name="dateOfBirth" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={getMaxDate()} className={errors.dateOfBirth && formSubmitted ? 'error' : ''}/>
                  {errors.dateOfBirth && formSubmitted && (<div className="error-message">{errors.dateOfBirth}</div>)}
                </div>
              </div>
              <div className="form-row">
                <div className={`terms-of-service-container ${errors.terms && formSubmitted ? 'error' : ''}`}>
                  <div className={`checkbox-container ${termsAccepted ? 'checked' : ''}`} onClick={() => setTermsAccepted(!termsAccepted)}></div>
                  <div className="caption">
                    I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
                  </div>
                  {errors.terms && formSubmitted && (<div className="error-message">{errors.terms}</div>)}
                </div>
              </div>

              {errors.form && (<div className="form-row">
                  <div className="error-message">{errors.form}</div>
                </div>)}

              <div className="submit-button-wrapper">
                <div className="form-row form-row-loader-container">
                  <button className="btn-primary" type="submit" disabled={isLoading || !termsAccepted} title={!termsAccepted ? 'You must accept the terms of service' : ''}>
                    Create Account
                  </button>
                  <div className={`loader ${isLoading ? 'is-loading' : ''}`}>
                    <i className="fa fa-spinner"></i>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="image-container"></div>
        </div>
      </div>
    </div>);
}
;
//# sourceMappingURL=registration-form.jsx.map