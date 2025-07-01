"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchFiltersDialog;
const height_range_select_1 = __importDefault(require("@/common/height-range-select/height-range-select"));
require("./search-filters-dialog.scss");
const age_range_select_1 = __importDefault(require("@/common/age-range-select/age-range-select"));
const business_1 = require("@/config/business");
const lodash_1 = __importDefault(require("lodash"));
const user_interface_1 = require("@/types/user.interface");
const react_1 = require("react");
const material_1 = require("@mui/material");
const single_location_dialog_1 = __importDefault(require("@/app/home-search/search-filters-dialog/single-location-dialog/single-location-dialog"));
const selected_single_location_display_1 = __importDefault(require("@/app/home-search/search-filters-dialog/selected-single-location-display/selected-single-location-display"));
const react_line_awesome_1 = require("react-line-awesome");
const multi_country_select_1 = __importDefault(require("./multi-country-select/multi-country-select"));
const FormGroup_1 = __importDefault(require("@mui/material/FormGroup"));
const FormControlLabel_1 = __importDefault(require("@mui/material/FormControlLabel"));
const Checkbox_1 = __importDefault(require("@mui/material/Checkbox"));
const home_search_actions_1 = require("@/app/home-search/home-search.actions");
const navigation_1 = require("next/navigation");
const search_parameters_interface_1 = require("@/types/search-parameters.interface");
function SearchFiltersDialog({ currentUser, onApply, onClose }) {
    const searchParams = (0, navigation_1.useSearchParams)();
    const [seekingMinAge, setSeekingMinAge] = (0, react_1.useState)(currentUser.seekingMinAge || business_1.businessConfig.defaults.minAge);
    const [seekingMaxAge, setSeekingMaxAge] = (0, react_1.useState)(currentUser.seekingMaxAge || business_1.businessConfig.defaults.maxAge);
    const [seekingMinHeight, setSeekingMinHeight] = (0, react_1.useState)(currentUser.seekingMinHeight || business_1.businessConfig.defaults.minHeight);
    const [seekingMaxHeight, setSeekingMaxHeight] = (0, react_1.useState)(currentUser.seekingMaxHeight || business_1.businessConfig.defaults.maxHeight);
    const [seekingNumOfPhotos, setSeekingNumOfPhotos] = (0, react_1.useState)(currentUser.seekingNumOfPhotos || business_1.businessConfig.defaults.numOfPhotos);
    const [ethnicPreferences, setEthnicPreferences] = (0, react_1.useState)(currentUser.ethnicPreferences);
    const [religiousPreferences, setReligiousPreferences] = (0, react_1.useState)(currentUser.religiousPreferences);
    const [languagePreferences, setLanguagePreferences] = (0, react_1.useState)(currentUser.languagePreferences);
    const [interestPreferences, setInterestPreferences] = (0, react_1.useState)(currentUser.interestPreferences);
    const [maritalStatusPreferences, setMaritalStatusPreferences] = (0, react_1.useState)(currentUser.maritalStatusPreferences);
    const [bodyTypePreferences, setBodyTypePreferences] = (0, react_1.useState)(currentUser.bodyTypePreferences);
    const [hasChildrenPreferences, setHasChildrenPreferences] = (0, react_1.useState)(currentUser.hasChildrenPreferences);
    const [wantsChildrenPreferences, setWantsChildrenPreferences] = (0, react_1.useState)(currentUser.wantsChildrenPreferences);
    const [educationPreferences, setEducationPreferences] = (0, react_1.useState)(currentUser.educationPreferences);
    const [smokingPreferences, setSmokingPreferences] = (0, react_1.useState)(currentUser.smokingPreferences);
    const [drinkingPreferences, setDrinkingPreferences] = (0, react_1.useState)(currentUser.drinkingPreferences);
    const [seekingCountries, setSeekingCountries] = (0, react_1.useState)(currentUser.seekingCountries);
    const [seekingDistanceOrigin, setSeekingDistanceOrigin] = (0, react_1.useState)((currentUser.seekingDistanceOrigin || user_interface_1.SearchFromOrigin.CurrentLocation));
    const [seekingMaxDistance, setSeekingMaxDistance] = (0, react_1.useState)(currentUser.seekingMaxDistance || business_1.businessConfig.defaults.maxDistance);
    const [singleSearchLocation, setSingleSearchLocation] = (0, react_1.useState)(currentUser.singleSearchLocation);
    const [isSearchFromLocationModalOpen, setIsSearchFromLocationModalOpen] = (0, react_1.useState)(false);
    const [isCountrySelectModalOpen, setIsCountrySelectModalOpen] = (0, react_1.useState)(false);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const searchSortBy = (searchParams.get('sortBy') || search_parameters_interface_1.SearchSortBy.LastActive);
    const onSubmit = () => {
        // Validate that a location is selected if SingleLocation is chosen
        if (seekingDistanceOrigin === user_interface_1.SearchFromOrigin.SingleLocation && !singleSearchLocation) {
            alert('Please select a location before applying filters');
            return;
        }
        // Validate that countries are selected if MultipleCountries is chosen
        if (seekingDistanceOrigin === user_interface_1.SearchFromOrigin.MultipleCountries &&
            (!seekingCountries || seekingCountries.length === 0)) {
            alert('Please select at least one country before applying filters');
            return;
        }
        setIsSaving(true);
        (0, home_search_actions_1.updateUserSearchPreferences)({
            seekingMinAge: seekingMinAge,
            seekingMaxAge: seekingMaxAge,
            numberOfPhotos: seekingNumOfPhotos,
            seekingMinHeight: seekingMinHeight,
            seekingMaxHeight: seekingMaxHeight,
            ethnicities: ethnicPreferences,
            religions: religiousPreferences,
            languages: languagePreferences,
            interests: interestPreferences,
            maritalStatus: maritalStatusPreferences,
            bodyType: bodyTypePreferences,
            hasChildren: hasChildrenPreferences,
            wantsChildren: wantsChildrenPreferences,
            education: educationPreferences,
            smoking: smokingPreferences,
            drinking: drinkingPreferences,
            seekingCountries: seekingCountries,
            seekingDistanceOrigin: seekingDistanceOrigin,
            seekingMaxDistance: seekingMaxDistance,
            searchFromLocation: seekingDistanceOrigin === user_interface_1.SearchFromOrigin.SingleLocation ? singleSearchLocation : undefined
        }, searchSortBy).then((searchResponse) => {
            onApply(searchResponse);
            onClose();
        }).catch((error) => {
            alert('An error occurred while updating your search preferences');
            console.error(error);
        }).finally(() => {
            setIsSaving(false);
        });
    };
    return (<>
            <div className="filters-dialog-container">
                <div className="title-section">
                    <h2>Search Filters</h2>
                    <div className="close-button-container">
                        <button onClick={() => onClose()}>
                            <react_line_awesome_1.TimesIcon />
                        </button>
                    </div>
                </div>
                <div className="dialog-body">
                    <div className="input-container">
                        <label>Age</label>
                        <age_range_select_1.default minAge={seekingMinAge} maxAge={seekingMaxAge} onChange={(newValues) => {
            setSeekingMinAge(newValues.minAge);
            setSeekingMaxAge(newValues.maxAge);
        }}/>
                    </div>
                    <div className="input-container">
                        <label>Photos</label>
                        <div className="inline-form-container">
                            <span className="label">Has at least </span>
                            <select value={seekingNumOfPhotos} onChange={(e) => setSeekingNumOfPhotos(Number(e.target.value))} className="photo-count">
                                {Object.entries(business_1.businessConfig.options.numberOfPhotos).map(([value, label]) => (<option key={value} value={value}>
                                        {label}
                                    </option>))}
                            </select>
                            <span className="label">photos</span>
                        </div>
                    </div>
                    <div className="input-container">
                        <label>Height</label>
                        <height_range_select_1.default initialMinHeight={seekingMinHeight} initialMaxHeight={seekingMaxHeight} onChange={(newValues) => {
            setSeekingMinHeight(newValues.minHeight);
            setSeekingMaxHeight(newValues.maxHeight);
        }}/>
                    </div>
                    <div className="input-container">
                        <label>Location</label>
                        <div className="inline-form-container">
                            <select value={seekingDistanceOrigin} onChange={(e) => setSeekingDistanceOrigin(e.target.value)} className="current-location">
                                {lodash_1.default.toPairs(business_1.businessConfig.options.searchFromLocationTypes).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
                            </select>
                            {seekingDistanceOrigin === user_interface_1.SearchFromOrigin.CurrentLocation &&
            <select value={seekingMaxDistance} onChange={(e) => setSeekingMaxDistance(Number(e.target.value))} className="current-location-distance">
                                    {lodash_1.default.toPairs(business_1.businessConfig.options.distance).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
                                </select>}

                            {seekingDistanceOrigin === user_interface_1.SearchFromOrigin.SingleLocation &&
            <button type="button" onClick={() => setIsSearchFromLocationModalOpen(true)} className="location-button">
                                    {singleSearchLocation ? 'Edit' : 'Select'}
                                </button>}

                            {seekingDistanceOrigin === user_interface_1.SearchFromOrigin.MultipleCountries &&
            <button type="button" onClick={() => setIsCountrySelectModalOpen(true)} className="location-button">{(seekingCountries === null || seekingCountries === void 0 ? void 0 : seekingCountries.length) ? 'Edit' : 'Select'} Countries</button>}
                        </div>
                        {seekingDistanceOrigin === user_interface_1.SearchFromOrigin.MultipleCountries &&
            <div className="location-info">{(seekingCountries === null || seekingCountries === void 0 ? void 0 : seekingCountries.length) || 'No'} countries selected.</div>}
                        {seekingDistanceOrigin === user_interface_1.SearchFromOrigin.SingleLocation && singleSearchLocation &&
            <selected_single_location_display_1.default singleSearchLocation={singleSearchLocation} onRemove={() => setSingleSearchLocation(undefined)}/>}
                    </div>
                    <div className="input-container">
                        <label>Body Type</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setBodyTypePreferences([]);
                }
            }} checked={!(bodyTypePreferences === null || bodyTypePreferences === void 0 ? void 0 : bodyTypePreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.bodyTypes).map((bodyType) => {
            var _a;
            return <FormControlLabel_1.default key={bodyType[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setBodyTypePreferences((prevState) => [...(prevState || []), bodyType[0]]);
                        }
                        else {
                            setBodyTypePreferences((prevState) => (prevState || []).filter(aBodyType => aBodyType !== bodyType[0]));
                        }
                    }} checked={(_a = bodyTypePreferences === null || bodyTypePreferences === void 0 ? void 0 : bodyTypePreferences.includes(bodyType[0])) !== null && _a !== void 0 ? _a : false}/>} label={bodyType[1]}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                    <div className="input-container">
                        <label>Language</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setLanguagePreferences([]);
                }
            }} checked={!(languagePreferences === null || languagePreferences === void 0 ? void 0 : languagePreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.languages).map((language) => {
            var _a;
            return <FormControlLabel_1.default key={language[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setLanguagePreferences((prevState) => [...(prevState || []), language[0]]);
                        }
                        else {
                            setLanguagePreferences((prevState) => (prevState || []).filter(aLanguage => aLanguage !== language[0]));
                        }
                    }} checked={(_a = languagePreferences === null || languagePreferences === void 0 ? void 0 : languagePreferences.includes(language[0])) !== null && _a !== void 0 ? _a : false}/>} label={language[1]}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                    <div className="input-container">
                        <label>Education Level</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setEducationPreferences([]);
                }
            }} checked={!(educationPreferences === null || educationPreferences === void 0 ? void 0 : educationPreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.educationLevels).map((education) => {
            var _a;
            return <FormControlLabel_1.default key={education[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setEducationPreferences((prevState) => [...(prevState || []), education[0]]);
                        }
                        else {
                            setEducationPreferences((prevState) => (prevState || []).filter(anEducation => anEducation !== education[0]));
                        }
                    }} checked={(_a = educationPreferences === null || educationPreferences === void 0 ? void 0 : educationPreferences.includes(education[0])) !== null && _a !== void 0 ? _a : false}/>} label={education[1]}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                    <div className="input-container">
                        <label>Ethnicity</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setEthnicPreferences([]);
                }
            }} checked={!(ethnicPreferences === null || ethnicPreferences === void 0 ? void 0 : ethnicPreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.ethnicities).map((ethnicity) => {
            var _a;
            return <FormControlLabel_1.default key={ethnicity[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setEthnicPreferences((prevState) => [...(prevState || []), ethnicity[0]]);
                        }
                        else {
                            setEthnicPreferences((prevState) => (prevState || []).filter(anEthnicity => anEthnicity !== ethnicity[0]));
                        }
                    }} checked={(_a = ethnicPreferences === null || ethnicPreferences === void 0 ? void 0 : ethnicPreferences.includes(ethnicity[0])) !== null && _a !== void 0 ? _a : false}/>} label={ethnicity[1]}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                    <div className="input-container">
                        <label>Marital Status</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setMaritalStatusPreferences([]);
                }
            }} checked={!(maritalStatusPreferences === null || maritalStatusPreferences === void 0 ? void 0 : maritalStatusPreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.maritalStatuses).map((maritalStatus) => {
            var _a;
            return <FormControlLabel_1.default key={maritalStatus[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setMaritalStatusPreferences((prevState) => [...(prevState || []), maritalStatus[0]]);
                        }
                        else {
                            setMaritalStatusPreferences((prevState) => (prevState || []).filter(aMaritalStatus => aMaritalStatus !== maritalStatus[0]));
                        }
                    }} checked={(_a = maritalStatusPreferences === null || maritalStatusPreferences === void 0 ? void 0 : maritalStatusPreferences.includes(maritalStatus[0])) !== null && _a !== void 0 ? _a : false}/>} label={maritalStatus[1]}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                    <div className="input-container">
                        <label>Religion</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setReligiousPreferences([]);
                }
            }} checked={!(religiousPreferences === null || religiousPreferences === void 0 ? void 0 : religiousPreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.religions).map((religion) => {
            var _a;
            return <FormControlLabel_1.default key={religion[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setReligiousPreferences((prevState) => [...(prevState || []), religion[0]]);
                        }
                        else {
                            setReligiousPreferences((prevState) => (prevState || []).filter(aReligion => aReligion !== religion[0]));
                        }
                    }} checked={(_a = religiousPreferences === null || religiousPreferences === void 0 ? void 0 : religiousPreferences.includes(religion[0])) !== null && _a !== void 0 ? _a : false}/>} label={religion[1]}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                    <div className="input-container">
                        <label>Has Children</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setHasChildrenPreferences([]);
                }
            }} checked={!(hasChildrenPreferences === null || hasChildrenPreferences === void 0 ? void 0 : hasChildrenPreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.hasChildrenStatuses).map((hasChildren) => {
            var _a;
            return <FormControlLabel_1.default key={hasChildren[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setHasChildrenPreferences((prevState) => [...(prevState || []), hasChildren[0]]);
                        }
                        else {
                            setHasChildrenPreferences((prevState) => (prevState || []).filter(aHasChildren => aHasChildren !== hasChildren[0]));
                        }
                    }} checked={(_a = hasChildrenPreferences === null || hasChildrenPreferences === void 0 ? void 0 : hasChildrenPreferences.includes(hasChildren[0])) !== null && _a !== void 0 ? _a : false}/>} label={hasChildren[1]}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                    <div className="row-container">
                        <div className="column">
                            <label>Drinking</label>
                            <FormGroup_1.default className="vertical-checkboxes">
                                <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setDrinkingPreferences([]);
                }
            }} checked={!(drinkingPreferences === null || drinkingPreferences === void 0 ? void 0 : drinkingPreferences.length)}/>} label="Any"/>
                                {lodash_1.default.toPairs(business_1.businessConfig.options.drinkingStatuses).map((drinking) => {
            var _a;
            return <FormControlLabel_1.default key={drinking[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setDrinkingPreferences((prevState) => [...(prevState || []), drinking[0]]);
                        }
                        else {
                            setDrinkingPreferences((prevState) => (prevState || []).filter(aDrinking => aDrinking !== drinking[0]));
                        }
                    }} checked={(_a = drinkingPreferences === null || drinkingPreferences === void 0 ? void 0 : drinkingPreferences.includes(drinking[0])) !== null && _a !== void 0 ? _a : false}/>} label={drinking[1]}/>;
        })}
                            </FormGroup_1.default>
                        </div>

                        <div className="column">
                            <label>Smoking</label>
                            <FormGroup_1.default className="vertical-checkboxes">
                                <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setSmokingPreferences([]);
                }
            }} checked={!(smokingPreferences === null || smokingPreferences === void 0 ? void 0 : smokingPreferences.length)}/>} label="Any"/>
                                {lodash_1.default.toPairs(business_1.businessConfig.options.smokingStatuses).map((smoking) => {
            var _a;
            return <FormControlLabel_1.default key={smoking[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setSmokingPreferences((prevState) => [...(prevState || []), smoking[0]]);
                        }
                        else {
                            setSmokingPreferences((prevState) => (prevState || []).filter(aSmoking => aSmoking !== smoking[0]));
                        }
                    }} checked={(_a = smokingPreferences === null || smokingPreferences === void 0 ? void 0 : smokingPreferences.includes(smoking[0])) !== null && _a !== void 0 ? _a : false}/>} label={smoking[1]}/>;
        })}
                            </FormGroup_1.default>
                        </div>

                        <div className="column">
                            <label>Wants Children</label>
                            <FormGroup_1.default className="vertical-checkboxes">
                                <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setWantsChildrenPreferences([]);
                }
            }} checked={!(wantsChildrenPreferences === null || wantsChildrenPreferences === void 0 ? void 0 : wantsChildrenPreferences.length)}/>} label="Any"/>
                                {lodash_1.default.toPairs(business_1.businessConfig.options.wantsChildrenStatuses).map((wantsChildren) => {
            var _a;
            return <FormControlLabel_1.default key={wantsChildren[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setWantsChildrenPreferences((prevState) => [...(prevState || []), wantsChildren[0]]);
                        }
                        else {
                            setWantsChildrenPreferences((prevState) => (prevState || []).filter(aWantsChildren => aWantsChildren !== wantsChildren[0]));
                        }
                    }} checked={(_a = wantsChildrenPreferences === null || wantsChildrenPreferences === void 0 ? void 0 : wantsChildrenPreferences.includes(wantsChildren[0])) !== null && _a !== void 0 ? _a : false}/>} label={wantsChildren[1]}/>;
        })}
                            </FormGroup_1.default>
                        </div>
                    </div>

                    <div className="input-container">
                        <label>Interests</label>
                        <FormGroup_1.default row className="inline-checkboxes">
                            <FormControlLabel_1.default control={<Checkbox_1.default onChange={(e) => {
                if (e.target.checked) {
                    setInterestPreferences([]);
                }
            }} checked={!(interestPreferences === null || interestPreferences === void 0 ? void 0 : interestPreferences.length)}/>} label="Any"/>
                            {lodash_1.default.toPairs(business_1.businessConfig.options.interests).map((interest) => {
            var _a;
            return <FormControlLabel_1.default key={interest[0]} control={<Checkbox_1.default onChange={(e) => {
                        if (e.target.checked) {
                            setInterestPreferences((prevState) => [...(prevState || []), interest[0]]);
                        }
                        else {
                            setInterestPreferences((prevState) => (prevState || []).filter(anInterest => anInterest !== interest[0]));
                        }
                    }} checked={(_a = interestPreferences === null || interestPreferences === void 0 ? void 0 : interestPreferences.includes(interest[0])) !== null && _a !== void 0 ? _a : false}/>} label={`${interest[1].emoji} ${interest[1].label}`}/>;
        })}
                        </FormGroup_1.default>
                    </div>
                </div>
                <div className="button-container">
                    <button className="apply-button btn-primary" type="submit" onClick={() => onSubmit()} disabled={isSaving ||
            (seekingDistanceOrigin === user_interface_1.SearchFromOrigin.SingleLocation && !singleSearchLocation) ||
            (seekingDistanceOrigin === user_interface_1.SearchFromOrigin.MultipleCountries && (!seekingCountries || seekingCountries.length === 0))}>
                        {isSaving ? 'Saving...' : 'Apply Filters'}
                    </button>
                    <button className="cancel-button" type="button" onClick={() => onClose()}>Cancel</button>
                </div>
            </div>
            <material_1.Modal open={isSearchFromLocationModalOpen}>
                <single_location_dialog_1.default defaultSingleSearchLocation={singleSearchLocation} onUpdate={setSingleSearchLocation} onClose={() => setIsSearchFromLocationModalOpen(false)}/>
            </material_1.Modal>
            <material_1.Modal open={isCountrySelectModalOpen}>
                <multi_country_select_1.default selectedCountries={seekingCountries} onUpdate={setSeekingCountries} onClose={() => setIsCountrySelectModalOpen(false)}/>
            </material_1.Modal>
        </>);
}
//# sourceMappingURL=search-filters-dialog.jsx.map