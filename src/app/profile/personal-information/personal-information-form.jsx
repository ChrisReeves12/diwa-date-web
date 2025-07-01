"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonalInformationForm = PersonalInformationForm;
const react_1 = require("react");
const business_1 = require("@/config/business");
const seeking_match_form_1 = __importDefault(require("@/common/seeking-match-form/seeking-match-form"));
const location_search_1 = __importDefault(require("@/common/location-search/location-search"));
const multi_select_1 = __importDefault(require("@/common/multi-select/multi-select"));
const single_select_1 = __importDefault(require("@/common/single-select/single-select"));
const personal_information_actions_1 = require("./personal-information-actions");
function PersonalInformationForm({ currentUser }) {
    var _a;
    // Form ref for scrolling
    const formRef = (0, react_1.useRef)(null);
    // Basic Information
    const [displayName, setDisplayName] = (0, react_1.useState)(currentUser.displayName || '');
    const [email, setEmail] = (0, react_1.useState)(currentUser.email || '');
    const [firstName, setFirstName] = (0, react_1.useState)(currentUser.firstName || '');
    const [lastName, setLastName] = (0, react_1.useState)(currentUser.lastName || '');
    const [dateOfBirth, setDateOfBirth] = (0, react_1.useState)(currentUser.dateOfBirth ? new Date(currentUser.dateOfBirth).toISOString().split('T')[0] : '');
    const [bio, setBio] = (0, react_1.useState)(currentUser.bio || '');
    // Location Information
    const [selectedLocation, setSelectedLocation] = (0, react_1.useState)(currentUser.locationName ? {
        name: currentUser.locationName,
        coordinates: {
            latitude: currentUser.latitude || 0,
            longitude: currentUser.longitude || 0
        },
        country: currentUser.country || '',
        viewport: currentUser.locationViewport
    } : undefined);
    // Gender Information
    const [userGender, setUserGender] = (0, react_1.useState)(currentUser.gender || '');
    const [seekingGender, setSeekingGender] = (0, react_1.useState)(currentUser.seekingGender || '');
    // Appearance
    const [height, setHeight] = (0, react_1.useState)(((_a = currentUser.height) === null || _a === void 0 ? void 0 : _a.toString()) || '');
    const [bodyType, setBodyType] = (0, react_1.useState)(currentUser.bodyType || '');
    // Culture and Background
    const [ethnicities, setEthnicities] = (0, react_1.useState)(currentUser.ethnicities || []);
    const [religions, setReligions] = (0, react_1.useState)(currentUser.religions || []);
    const [education, setEducation] = (0, react_1.useState)(currentUser.education || '');
    const [languages, setLanguages] = (0, react_1.useState)(currentUser.languages || []);
    // Family
    const [maritalStatus, setMaritalStatus] = (0, react_1.useState)(currentUser.maritalStatus || '');
    const [hasChildren, setHasChildren] = (0, react_1.useState)(currentUser.hasChildren || '');
    const [wantsChildren, setWantsChildren] = (0, react_1.useState)(currentUser.wantsChildren || '');
    // Social Activity and Lifestyle
    const [drinking, setDrinking] = (0, react_1.useState)(currentUser.drinking || '');
    const [smoking, setSmoking] = (0, react_1.useState)(currentUser.smoking || '');
    const [interests, setInterests] = (0, react_1.useState)(currentUser.interests || []);
    // Form state
    const [errors, setErrors] = (0, react_1.useState)({});
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [successMessage, setSuccessMessage] = (0, react_1.useState)('');
    // Calculate max date (18 years ago)
    const getMaxDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        return today.toISOString().split('T')[0];
    };
    // Validate form
    const validateForm = () => {
        const newErrors = {};
        // Required fields
        if (!displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }
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
        if (!selectedLocation) {
            newErrors.location = 'Location is required';
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
        if (!userGender) {
            newErrors.userGender = 'Gender is required';
        }
        if (!seekingGender) {
            newErrors.seekingGender = 'Seeking gender is required';
        }
        // Bio validation
        if (bio && (bio.length < 50 || bio.length > 3000)) {
            newErrors.bio = 'About me must be between 50 and 3000 characters';
        }
        // Multi-select limits
        if (ethnicities.length > 3) {
            newErrors.ethnicities = 'You can select up to 3 ethnicities';
        }
        if (religions.length > 3) {
            newErrors.religions = 'You can select up to 3 religions';
        }
        if (languages.length > 3) {
            newErrors.languages = 'You can select up to 3 languages';
        }
        if (interests.length > 7) {
            newErrors.interests = 'You can select up to 7 interests';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsLoading(true);
        setSuccessMessage('');
        try {
            const formData = {
                displayName,
                email,
                firstName,
                lastName,
                dateOfBirth,
                bio,
                location: selectedLocation,
                userGender,
                seekingGender,
                height: height ? parseInt(height) : undefined,
                bodyType,
                ethnicities,
                religions,
                education,
                languages,
                maritalStatus,
                hasChildren,
                wantsChildren,
                drinking,
                smoking,
                interests
            };
            const result = await (0, personal_information_actions_1.updatePersonalInformation)(formData);
            if (result.success) {
                setSuccessMessage('Profile updated successfully!');
                setErrors({});
                // Scroll to top of page after successful update
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
            else {
                if (result.errors) {
                    setErrors(result.errors);
                }
                else {
                    setErrors({ form: 'Update failed' });
                }
            }
        }
        catch (error) {
            console.error('Update error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        }
        finally {
            setIsLoading(false);
        }
    };
    // Convert business config options to component format
    const heightOptions = Object.entries(business_1.businessConfig.options.height).map(([value, label]) => ({
        value,
        label
    }));
    const bodyTypeOptions = Object.entries(business_1.businessConfig.options.bodyTypes).map(([value, label]) => ({
        value,
        label
    }));
    const ethnicityOptions = Object.entries(business_1.businessConfig.options.ethnicities).map(([value, label]) => ({
        value,
        label
    }));
    const religionOptions = Object.entries(business_1.businessConfig.options.religions).map(([value, label]) => ({
        value,
        label
    }));
    const educationOptions = Object.entries(business_1.businessConfig.options.educationLevels).map(([value, label]) => ({
        value,
        label
    }));
    const languageOptions = Object.entries(business_1.businessConfig.options.languages).map(([value, label]) => ({
        value,
        label
    }));
    const maritalStatusOptions = Object.entries(business_1.businessConfig.options.maritalStatuses).map(([value, label]) => ({
        value,
        label
    }));
    const hasChildrenOptions = Object.entries(business_1.businessConfig.options.hasChildrenStatuses).map(([value, label]) => ({
        value,
        label
    }));
    const wantsChildrenOptions = Object.entries(business_1.businessConfig.options.wantsChildrenStatuses).map(([value, label]) => ({
        value,
        label
    }));
    const drinkingOptions = Object.entries(business_1.businessConfig.options.drinkingStatuses).map(([value, label]) => ({
        value,
        label
    }));
    const smokingOptions = Object.entries(business_1.businessConfig.options.smokingStatuses).map(([value, label]) => ({
        value,
        label
    }));
    const interestOptions = Object.entries(business_1.businessConfig.options.interests).map(([value, config]) => ({
        value,
        label: config.label,
        emoji: config.emoji
    }));
    return (<div className="personal-information-form" ref={formRef}>
            <form onSubmit={handleSubmit}>
                {/* Basic Information Section */}
                <div className="form-section">
                    <h3>Basic Information</h3>
                    
                    <div className="form-row">
                        <div className={`input-container ${errors.displayName ? 'error' : ''}`}>
                            <label htmlFor="displayName">Display Name *</label>
                            <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={errors.displayName ? 'error' : ''}/>
                            {errors.displayName && (<div className="error-message">{errors.displayName}</div>)}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className={`input-container ${errors.email ? 'error' : ''}`}>
                            <label htmlFor="email">Email *</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? 'error' : ''}/>
                            {errors.email && (<div className="error-message">{errors.email}</div>)}
                            <div className="sub-label">Email verification will be required for changes</div>
                        </div>
                    </div>

                    <div className="form-row form-row-split">
                        <div className={`input-container ${errors.firstName ? 'error' : ''}`}>
                            <label htmlFor="firstName">First Name *</label>
                            <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={errors.firstName ? 'error' : ''}/>
                            {errors.firstName && (<div className="error-message">{errors.firstName}</div>)}
                        </div>

                        <div className={`input-container ${errors.lastName ? 'error' : ''}`}>
                            <label htmlFor="lastName">Last Name *</label>
                            <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={errors.lastName ? 'error' : ''}/>
                            {errors.lastName && (<div className="error-message">{errors.lastName}</div>)}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className={`input-container ${errors.dateOfBirth ? 'error' : ''}`}>
                            <label htmlFor="dateOfBirth">Date of Birth *</label>
                            <input type="date" id="dateOfBirth" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={getMaxDate()} className={errors.dateOfBirth ? 'error' : ''}/>
                            {errors.dateOfBirth && (<div className="error-message">{errors.dateOfBirth}</div>)}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className={`input-container ${errors.bio ? 'error' : ''}`}>
                            <label htmlFor="bio">About Me</label>
                            <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className={errors.bio ? 'error' : ''} placeholder="Tell others about yourself..." rows={4}/>
                            <div className="character-counter">
                                {bio.length}/3000 characters
                                {bio.length > 0 && bio.length < 50 && (<span className="min-warning"> (minimum 50 characters)</span>)}
                            </div>
                            {errors.bio && (<div className="error-message">{errors.bio}</div>)}
                        </div>
                    </div>
                </div>

                {/* Location Information Section */}
                <div className="form-section">
                    <h3>Location Information</h3>
                    <location_search_1.default onUpdate={(locality) => setSelectedLocation(locality)} error={errors.location} initialLocality={selectedLocation}/>
                </div>

                {/* Gender Information Section */}
                <div className="form-section">
                    <h3>Gender Identification and Seeking</h3>
                    <seeking_match_form_1.default initialUserSex={userGender} initialUserSexSeeking={seekingGender} userSexError={errors.userGender} userSexSeekingError={errors.seekingGender} onUpdate={(data) => {
            if (data.userSex)
                setUserGender(data.userSex);
            if (data.userSexSeeking)
                setSeekingGender(data.userSexSeeking);
        }}/>
                </div>

                {/* Appearance Section */}
                <div className="form-section">
                    <h3>Appearance</h3>
                    
                    <div className="form-row form-row-split">
                        <single_select_1.default options={heightOptions} selectedValue={height} onChange={setHeight} label="Height" placeholder="Select height..."/>

                        <single_select_1.default options={bodyTypeOptions} selectedValue={bodyType} onChange={setBodyType} label="Body Type" placeholder="Select body type..."/>
                    </div>
                </div>

                {/* Culture and Background Section */}
                <div className="form-section">
                    <h3>Culture and Background</h3>
                    
                    <multi_select_1.default options={ethnicityOptions} selectedValues={ethnicities} onChange={setEthnicities} maxSelections={3} label="Ethnicity" placeholder="Select up to 3 ethnicities..." error={errors.ethnicities}/>

                    <multi_select_1.default options={religionOptions} selectedValues={religions} onChange={setReligions} maxSelections={3} label="Religion" placeholder="Select up to 3 religions..." error={errors.religions}/>

                    <div className="form-row form-row-split">
                        <single_select_1.default options={educationOptions} selectedValue={education} onChange={setEducation} label="Highest Level of Education" placeholder="Select education level..."/>

                        <div style={{ flex: 1 }}>
                            <multi_select_1.default options={languageOptions} selectedValues={languages} onChange={setLanguages} maxSelections={3} label="Languages" placeholder="Select up to 3 languages..." error={errors.languages}/>
                        </div>
                    </div>
                </div>

                {/* Family Section */}
                <div className="form-section">
                    <h3>Family</h3>
                    
                    <div className="form-row">
                        <single_select_1.default options={maritalStatusOptions} selectedValue={maritalStatus} onChange={setMaritalStatus} label="Marital Status" placeholder="Select marital status..."/>
                    </div>

                    <div className="form-row form-row-split">
                        <single_select_1.default options={hasChildrenOptions} selectedValue={hasChildren} onChange={setHasChildren} label="Do you have children?" placeholder="Select option..."/>

                        <single_select_1.default options={wantsChildrenOptions} selectedValue={wantsChildren} onChange={setWantsChildren} label="Do you want children?" placeholder="Select option..."/>
                    </div>
                </div>

                {/* Social Activity and Lifestyle Section */}
                <div className="form-section">
                    <h3>Social Activity and Lifestyle</h3>
                    
                    <div className="form-row form-row-split">
                        <single_select_1.default options={drinkingOptions} selectedValue={drinking} onChange={setDrinking} label="Do you drink?" placeholder="Select option..."/>

                        <single_select_1.default options={smokingOptions} selectedValue={smoking} onChange={setSmoking} label="Do you smoke?" placeholder="Select option..."/>
                    </div>

                    <multi_select_1.default options={interestOptions} selectedValues={interests} onChange={setInterests} maxSelections={7} label="Interests" placeholder="Select up to 7 interests..." error={errors.interests}/>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                    {successMessage && (<div className="success-message">{successMessage}</div>)}
                    
                    {errors.form && (<div className="error-message">{errors.form}</div>)}

                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Updating...' : 'Update Profile'}
                    </button>
                </div>
            </form>
        </div>);
}
//# sourceMappingURL=personal-information-form.jsx.map