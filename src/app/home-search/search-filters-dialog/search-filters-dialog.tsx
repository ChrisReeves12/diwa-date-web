import HeightRangeSelect from '@/common/height-range-select/height-range-select';
import './search-filters-dialog.scss';
import AgeRangeSelect from "@/common/age-range-select/age-range-select";
import { businessConfig } from '@/config/business';
import _ from 'lodash';
import { SearchFromOrigin, User } from '@/types/user.interface';
import { useState } from 'react';
import { Modal } from '@mui/material';
import SingleLocationDialog
    from "@/app/home-search/search-filters-dialog/single-location-dialog/single-location-dialog";
import { SingleSearchLocation } from "@/types";
import SelectedSingleLocationDisplay
    from "@/app/home-search/search-filters-dialog/selected-single-location-display/selected-single-location-display";
import { TimesIcon } from "react-line-awesome";
import MultiCountrySelect from './multi-country-select/multi-country-select';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { updateUserSearchPreferences } from "@/app/home-search/home-search.actions";
import { useSearchParams } from 'next/navigation';
import { SearchSortBy } from '@/types/search-parameters.interface';
import { SearchResponse } from "@/types/search-response.interface";
import { showAlert } from '@/util';

interface SearchFiltersDialogProps {
    currentUser: Omit<User, 'password'>;
    onApply: (searchResponse: SearchResponse) => void;
    onClose: () => void;
}

export default function SearchFiltersDialog({ currentUser, onApply, onClose }: SearchFiltersDialogProps) {
    const searchParams = useSearchParams();
    const [seekingMinAge, setSeekingMinAge] = useState<number>(currentUser.seekingMinAge || businessConfig.defaults.minAge);
    const [seekingMaxAge, setSeekingMaxAge] = useState<number>(currentUser.seekingMaxAge || businessConfig.defaults.maxAge);
    const [seekingMinHeight, setSeekingMinHeight] = useState<number>(currentUser.seekingMinHeight || businessConfig.defaults.minHeight);
    const [seekingMaxHeight, setSeekingMaxHeight] = useState<number>(currentUser.seekingMaxHeight || businessConfig.defaults.maxHeight);
    const [seekingNumOfPhotos, setSeekingNumOfPhotos] = useState<number>(currentUser.seekingNumOfPhotos || businessConfig.defaults.numOfPhotos);
    const [ethnicPreferences, setEthnicPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.ethnicPreferences : []);
    const [religiousPreferences, setReligiousPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.religiousPreferences : []);
    const [languagePreferences, setLanguagePreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.languagePreferences : []);
    const [interestPreferences, setInterestPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.interestPreferences : []);
    const [maritalStatusPreferences, setMaritalStatusPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.maritalStatusPreferences : []);
    const [bodyTypePreferences, setBodyTypePreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.bodyTypePreferences : []);
    const [hasChildrenPreferences, setHasChildrenPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.hasChildrenPreferences : []);
    const [wantsChildrenPreferences, setWantsChildrenPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.wantsChildrenPreferences : []);
    const [educationPreferences, setEducationPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.educationPreferences : []);
    const [smokingPreferences, setSmokingPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.smokingPreferences : []);
    const [drinkingPreferences, setDrinkingPreferences] = useState<string[] | undefined>(currentUser.isPremium ? currentUser.drinkingPreferences : []);
    const [seekingCountries, setSeekingCountries] = useState<string[] | undefined>(currentUser.seekingCountries);
    const [seekingDistanceOrigin, setSeekingDistanceOrigin] = useState<SearchFromOrigin>((currentUser.seekingDistanceOrigin || SearchFromOrigin.CurrentLocation) as SearchFromOrigin);
    const [seekingMaxDistance, setSeekingMaxDistance] = useState<number>(currentUser.seekingMaxDistance || businessConfig.defaults.maxDistance);
    const [singleSearchLocation, setSingleSearchLocation] = useState<SingleSearchLocation | undefined>(currentUser.singleSearchLocation);
    const [isSearchFromLocationModalOpen, setIsSearchFromLocationModalOpen] = useState<boolean>(false);
    const [isCountrySelectModalOpen, setIsCountrySelectModalOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const searchSortBy = (searchParams.get('sortBy') || SearchSortBy.LastActive) as SearchSortBy;
    const [sortBy, setSortBy] = useState<SearchSortBy>(searchSortBy);

    const onSubmit = () => {
        // Validate that a location is selected if SingleLocation is chosen
        if (seekingDistanceOrigin === SearchFromOrigin.SingleLocation && !singleSearchLocation) {
            showAlert('Please select a location before applying filters');
            return;
        }

        // Validate that countries are selected if MultipleCountries is chosen
        if (seekingDistanceOrigin === SearchFromOrigin.MultipleCountries &&
            (!seekingCountries || seekingCountries.length === 0)) {
            showAlert('Please select at least one country before applying filters');
            return;
        }

        // Reflect selected sort in URL
        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', sortBy);
        history.pushState({}, '', `?${params.toString()}`);

        setIsSaving(true);
        updateUserSearchPreferences({
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
            searchFromLocation: seekingDistanceOrigin === SearchFromOrigin.SingleLocation ? singleSearchLocation : undefined
        }, sortBy).then((searchResponse) => {
            onApply(searchResponse);
            onClose();
        }).catch((error) => {
            showAlert('An error occurred while updating your search preferences');
            console.error(error);
        }).finally(() => {
            setIsSaving(false);
        });
    };

    return (
        <>
            <div className="filters-dialog-container">
                <div className="title-section">
                    <h2>Search Filters</h2>
                    <div className="close-button-container">
                        <button onClick={() => onClose()}>
                            <TimesIcon />
                        </button>
                    </div>
                </div>
                <div className="dialog-body">
                    <div className="input-container">
                        <label>Order By</label>
                        <div className="input-container order-by-container">
                            <select value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SearchSortBy)}
                                className="order-by">
                                <option value={SearchSortBy.LastActive}>Last Active</option>
                                <option value={SearchSortBy.Newest}>Newest Member</option>
                                <option value={SearchSortBy.Age}>Age</option>
                                <option value={SearchSortBy.NumberOfPhotos}>Photo Count</option>
                            </select>
                        </div>
                    </div>
                    <div className="input-container">
                        <label>Age</label>
                        <AgeRangeSelect minAge={seekingMinAge} maxAge={seekingMaxAge} onChange={(newValues) => {
                            setSeekingMinAge(newValues.minAge);
                            setSeekingMaxAge(newValues.maxAge);
                        }} />
                    </div>
                    <div className="input-container">
                        <label>Photos</label>
                        <div className="inline-form-container">
                            <span className="label">Has at least </span>
                            <select value={seekingNumOfPhotos} onChange={(e) => setSeekingNumOfPhotos(Number(e.target.value))} className="photo-count">
                                {Object.entries(businessConfig.options.numberOfPhotos).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>))}
                            </select>
                            <span className="label">photos</span>
                        </div>
                    </div>
                    <div className="input-container">
                        <label>Height</label>
                        <HeightRangeSelect initialMinHeight={seekingMinHeight} initialMaxHeight={seekingMaxHeight} onChange={(newValues) => {
                            setSeekingMinHeight(newValues.minHeight);
                            setSeekingMaxHeight(newValues.maxHeight);
                        }} />
                    </div>
                    <div className="input-container">
                        <label>Location</label>
                        <div className="inline-form-container">
                            <select value={seekingDistanceOrigin} onChange={(e) => setSeekingDistanceOrigin(e.target.value as SearchFromOrigin)} className="current-location">
                                {_.toPairs(businessConfig.options.searchFromLocationTypes).map(([key, val]) =>
                                    <option key={key} value={key}>{val}</option>)}
                            </select>
                            {seekingDistanceOrigin === SearchFromOrigin.CurrentLocation &&
                                <select value={seekingMaxDistance} onChange={(e) => setSeekingMaxDistance(Number(e.target.value))} className="current-location-distance">
                                    {_.toPairs(businessConfig.options.distance).map(([key, val]) =>
                                        <option key={key} value={key}>{val}</option>)}
                                </select>}

                            {seekingDistanceOrigin === SearchFromOrigin.SingleLocation &&
                                <button type="button" onClick={() => setIsSearchFromLocationModalOpen(true)} className="location-button">
                                    {singleSearchLocation ? 'Edit' : 'Select'}
                                </button>}

                            {seekingDistanceOrigin === SearchFromOrigin.MultipleCountries &&
                                <button type="button" onClick={() => setIsCountrySelectModalOpen(true)}
                                    className="location-button">{seekingCountries?.length ? 'Edit' : 'Select'} Countries</button>}
                        </div>
                        {seekingDistanceOrigin === SearchFromOrigin.MultipleCountries &&
                            <div className="location-info">{seekingCountries?.length || 'No'} countries selected.</div>}
                        {seekingDistanceOrigin === SearchFromOrigin.SingleLocation && singleSearchLocation &&
                            <SelectedSingleLocationDisplay
                                singleSearchLocation={singleSearchLocation}
                                onRemove={() => setSingleSearchLocation(undefined)} />}
                    </div>
                    {!currentUser.isPremium && (
                        <div className="premium-notification-banner">
                            <p>The following filters are only available to premium users.</p>
                            <a href="/upgrade" className="upgrade-link">Upgrade to Premium</a>
                        </div>
                    )}
                    <div className="premium-search-filters">
                        <div className="input-container">
                            <label>Body Type</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setBodyTypePreferences([]);
                                            }
                                        }}
                                        checked={!bodyTypePreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.bodyTypes).map((bodyType) =>
                                    <FormControlLabel key={bodyType[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setBodyTypePreferences((prevState) =>
                                                        [...(prevState || []), bodyType[0]]);
                                                } else {
                                                    setBodyTypePreferences((prevState) =>
                                                        (prevState || []).filter(aBodyType => aBodyType !== bodyType[0])
                                                    );
                                                }
                                            }}
                                            checked={bodyTypePreferences?.includes(bodyType[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={bodyType[1]} />)}
                            </FormGroup>
                        </div>
                        <div className="input-container">
                            <label>Language</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setLanguagePreferences([]);
                                            }
                                        }}
                                        checked={!languagePreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.languages).map((language) =>
                                    <FormControlLabel key={language[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setLanguagePreferences((prevState) =>
                                                        [...(prevState || []), language[0]]);
                                                } else {
                                                    setLanguagePreferences((prevState) =>
                                                        (prevState || []).filter(aLanguage => aLanguage !== language[0])
                                                    );
                                                }
                                            }}
                                            checked={languagePreferences?.includes(language[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={language[1]} />)}
                            </FormGroup>
                        </div>
                        <div className="input-container">
                            <label>Education Level</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setEducationPreferences([]);
                                            }
                                        }}
                                        checked={!educationPreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.educationLevels).map((education) =>
                                    <FormControlLabel key={education[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setEducationPreferences((prevState) =>
                                                        [...(prevState || []), education[0]]);
                                                } else {
                                                    setEducationPreferences((prevState) =>
                                                        (prevState || []).filter(anEducation => anEducation !== education[0])
                                                    );
                                                }
                                            }}
                                            checked={educationPreferences?.includes(education[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={education[1]} />)}
                            </FormGroup>
                        </div>
                        <div className="input-container">
                            <label>Ethnicity</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setEthnicPreferences([]);
                                            }
                                        }}
                                        checked={!ethnicPreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.ethnicities).map((ethnicity) =>
                                    <FormControlLabel key={ethnicity[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setEthnicPreferences((prevState) =>
                                                        [...(prevState || []), ethnicity[0]]);
                                                } else {
                                                    setEthnicPreferences((prevState) =>
                                                        (prevState || []).filter(anEthnicity => anEthnicity !== ethnicity[0])
                                                    );
                                                }
                                            }}
                                            checked={ethnicPreferences?.includes(ethnicity[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={ethnicity[1]} />)}
                            </FormGroup>
                        </div>
                        <div className="input-container">
                            <label>Marital Status</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setMaritalStatusPreferences([]);
                                            }
                                        }}
                                        checked={!maritalStatusPreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.maritalStatuses).map((maritalStatus) =>
                                    <FormControlLabel key={maritalStatus[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setMaritalStatusPreferences((prevState) =>
                                                        [...(prevState || []), maritalStatus[0]]);
                                                } else {
                                                    setMaritalStatusPreferences((prevState) =>
                                                        (prevState || []).filter(aMaritalStatus => aMaritalStatus !== maritalStatus[0])
                                                    );
                                                }
                                            }}
                                            checked={maritalStatusPreferences?.includes(maritalStatus[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={maritalStatus[1]} />)}
                            </FormGroup>
                        </div>
                        <div className="input-container">
                            <label>Religion</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setReligiousPreferences([]);
                                            }
                                        }}
                                        checked={!religiousPreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.religions).map((religion) =>
                                    <FormControlLabel key={religion[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setReligiousPreferences((prevState) =>
                                                        [...(prevState || []), religion[0]]);
                                                } else {
                                                    setReligiousPreferences((prevState) =>
                                                        (prevState || []).filter(aReligion => aReligion !== religion[0])
                                                    );
                                                }
                                            }}
                                            checked={religiousPreferences?.includes(religion[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={religion[1]} />)}
                            </FormGroup>
                        </div>
                        <div className="input-container">
                            <label>Has Children</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setHasChildrenPreferences([]);
                                            }
                                        }}
                                        checked={!hasChildrenPreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.hasChildrenStatuses).map((hasChildren) =>
                                    <FormControlLabel key={hasChildren[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setHasChildrenPreferences((prevState) =>
                                                        [...(prevState || []), hasChildren[0]]);
                                                } else {
                                                    setHasChildrenPreferences((prevState) =>
                                                        (prevState || []).filter(aHasChildren => aHasChildren !== hasChildren[0])
                                                    );
                                                }
                                            }}
                                            checked={hasChildrenPreferences?.includes(hasChildren[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={hasChildren[1]} />)}
                            </FormGroup>
                        </div>
                        <div className="row-container">
                            <div className="column">
                                <label>Drinking</label>
                                <FormGroup className="vertical-checkboxes">
                                    <FormControlLabel
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setDrinkingPreferences([]);
                                                }
                                            }}
                                            checked={!drinkingPreferences?.length}
                                            disabled={!currentUser.isPremium} />}
                                        label="Any" />
                                    {_.toPairs(businessConfig.options.drinkingStatuses).map((drinking) =>
                                        <FormControlLabel key={drinking[0]}
                                            control={<Checkbox
                                                onChange={(e: any) => {
                                                    if (e.target.checked) {
                                                        setDrinkingPreferences((prevState) =>
                                                            [...(prevState || []), drinking[0]]);
                                                    } else {
                                                        setDrinkingPreferences((prevState) =>
                                                            (prevState || []).filter(aDrinking => aDrinking !== drinking[0])
                                                        );
                                                    }
                                                }}
                                                checked={drinkingPreferences?.includes(drinking[0]) ?? false}
                                                disabled={!currentUser.isPremium} />}
                                            label={drinking[1]} />)}
                                </FormGroup>
                            </div>

                            <div className="column">
                                <label>Smoking</label>
                                <FormGroup className="vertical-checkboxes">
                                    <FormControlLabel
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setSmokingPreferences([]);
                                                }
                                            }}
                                            checked={!smokingPreferences?.length}
                                            disabled={!currentUser.isPremium} />}
                                        label="Any" />
                                    {_.toPairs(businessConfig.options.smokingStatuses).map((smoking) =>
                                        <FormControlLabel key={smoking[0]}
                                            control={<Checkbox
                                                onChange={(e: any) => {
                                                    if (e.target.checked) {
                                                        setSmokingPreferences((prevState) =>
                                                            [...(prevState || []), smoking[0]]);
                                                    } else {
                                                        setSmokingPreferences((prevState) =>
                                                            (prevState || []).filter(aSmoking => aSmoking !== smoking[0])
                                                        );
                                                    }
                                                }}
                                                checked={smokingPreferences?.includes(smoking[0]) ?? false}
                                                disabled={!currentUser.isPremium} />}
                                            label={smoking[1]} />)}
                                </FormGroup>
                            </div>

                            <div className="column">
                                <label>Wants Children</label>
                                <FormGroup className="vertical-checkboxes">
                                    <FormControlLabel
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setWantsChildrenPreferences([]);
                                                }
                                            }}
                                            checked={!wantsChildrenPreferences?.length}
                                            disabled={!currentUser.isPremium} />}
                                        label="Any" />
                                    {_.toPairs(businessConfig.options.wantsChildrenStatuses).map((wantsChildren) =>
                                        <FormControlLabel key={wantsChildren[0]}
                                            control={<Checkbox
                                                onChange={(e: any) => {
                                                    if (e.target.checked) {
                                                        setWantsChildrenPreferences((prevState) =>
                                                            [...(prevState || []), wantsChildren[0]]);
                                                    } else {
                                                        setWantsChildrenPreferences((prevState) =>
                                                            (prevState || []).filter(aWantsChildren => aWantsChildren !== wantsChildren[0])
                                                        );
                                                    }
                                                }}
                                                checked={wantsChildrenPreferences?.includes(wantsChildren[0]) ?? false}
                                                disabled={!currentUser.isPremium} />}
                                            label={wantsChildren[1]} />)}
                                </FormGroup>
                            </div>
                        </div>
                        <div className="input-container">
                            <label>Interests</label>
                            <FormGroup row className="inline-checkboxes">
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                setInterestPreferences([]);
                                            }
                                        }}
                                        checked={!interestPreferences?.length}
                                        disabled={!currentUser.isPremium} />}
                                    label="Any" />
                                {_.toPairs(businessConfig.options.interests).map((interest) =>
                                    <FormControlLabel key={interest[0]}
                                        control={<Checkbox
                                            onChange={(e: any) => {
                                                if (e.target.checked) {
                                                    setInterestPreferences((prevState) =>
                                                        [...(prevState || []), interest[0]]);
                                                } else {
                                                    setInterestPreferences((prevState) =>
                                                        (prevState || []).filter(anInterest => anInterest !== interest[0])
                                                    );
                                                }
                                            }}
                                            checked={interestPreferences?.includes(interest[0]) ?? false}
                                            disabled={!currentUser.isPremium} />}
                                        label={`${interest[1].emoji} ${interest[1].label}`} />)}
                            </FormGroup>
                        </div>
                    </div>
                </div>
                <div className="button-container">
                    <button
                        className="apply-button btn-primary"
                        type="submit"
                        onClick={() => onSubmit()}
                        disabled={isSaving ||
                            (seekingDistanceOrigin === SearchFromOrigin.SingleLocation && !singleSearchLocation) ||
                            (seekingDistanceOrigin === SearchFromOrigin.MultipleCountries && (!seekingCountries || seekingCountries.length === 0))
                        }
                    >
                        {isSaving ? 'Saving...' : 'Apply Filters'}
                    </button>
                    <button className="cancel-button" type="button" onClick={() => onClose()}>Cancel</button>
                </div>
            </div>
            <Modal open={isSearchFromLocationModalOpen}>
                <SingleLocationDialog
                    defaultSingleSearchLocation={singleSearchLocation}
                    onUpdate={setSingleSearchLocation}
                    onClose={() => setIsSearchFromLocationModalOpen(false)} />
            </Modal>
            <Modal open={isCountrySelectModalOpen}>
                <MultiCountrySelect
                    selectedCountries={seekingCountries}
                    onUpdate={setSeekingCountries}
                    onClose={() => setIsCountrySelectModalOpen(false)}
                />
            </Modal>
        </>
    );
}
