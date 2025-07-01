"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SingleLocationDialog;
require("./single-location-dialog.scss");
const material_1 = require("@mui/material");
const countries_1 = require("@/config/countries");
const location_search_1 = __importDefault(require("@/common/location-search/location-search"));
const react_1 = require("react");
const react_line_awesome_1 = require("react-line-awesome");
const lodash_1 = __importDefault(require("lodash"));
const business_1 = require("@/config/business");
const selected_single_location_display_1 = __importDefault(require("@/app/home-search/search-filters-dialog/selected-single-location-display/selected-single-location-display"));
function SingleLocationDialog({ onClose, onUpdate, defaultSingleSearchLocation }) {
    const [singleLocationDistance, setSingleLocationDistance] = (0, react_1.useState)(100);
    const [singleLocationCountry, setSingleLocationCountry] = (0, react_1.useState)(null);
    const [singleSearchLocation, setSingleSearchLocation] = (0, react_1.useState)(defaultSingleSearchLocation);
    const [countryBounds, setCountryBounds] = (0, react_1.useState)();
    const getGeoBoundsForCountry = async (country) => {
        const geoCodeResult = await new Promise((resolve, reject) => {
            google.maps.importLibrary("geocoding").then((library) => {
                // @ts-expect-error dynamically loaded library
                const geocoder = new library.Geocoder();
                geocoder.geocode({
                    address: country.name,
                    region: country.code
                }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                        resolve(results[0]);
                    }
                    else {
                        reject(new Error('Geocoding failed'));
                    }
                });
            });
        });
        setCountryBounds(geoCodeResult.geometry.viewport);
    };
    return (<material_1.Box sx={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translate(-50%)',
            width: '40vw',
            maxWidth: 600,
            bgcolor: 'white',
            outlineWidth: 0,
            borderRadius: 1.5,
            boxShadow: 24
        }}>
            <div className="search-from-location-container-modal">
                <div className="title-section">
                    <h2>Search From Location</h2>
                    <div className="close-button-container">
                        <button onClick={() => onClose()}>
                            <react_line_awesome_1.TimesIcon />
                        </button>
                    </div>
                </div>
                <div className="body-section">
                    <div className="form-section">
                        {!singleSearchLocation && <div className="input-container country">
                            <label>Country</label>
                            <material_1.Autocomplete disablePortal options={countries_1.countries.map(country => country.name)} sx={{ width: '100%' }} value={singleLocationCountry} onChange={async (_, newValue) => {
                setSingleLocationCountry(newValue);
                const countryObj = countries_1.countries.find(country => country.name === newValue);
                if (newValue && countryObj) {
                    await getGeoBoundsForCountry(countryObj);
                }
            }} renderInput={(params) => <material_1.TextField {...params} placeholder="Select Country"/>}/>
                        </div>}
                        {countryBounds && !singleSearchLocation &&
            <div className="inline-form-container">
                                <location_search_1.default geoBounds={countryBounds} onUpdate={(locality) => {
                    if (locality) {
                        setSingleSearchLocation((prevState) => {
                            return ({
                                maxDistance: (prevState === null || prevState === void 0 ? void 0 : prevState.maxDistance) || lodash_1.default.toPairs(business_1.businessConfig.options.distance)[0][0].toString(),
                                selectedLocation: locality,
                                selectedCountry: locality.country,
                                regionViewport: {
                                    high: {
                                        latitude: countryBounds.getNorthEast().lat(),
                                        longitude: countryBounds.getNorthEast().lng()
                                    },
                                    low: {
                                        latitude: countryBounds.getSouthWest().lat(),
                                        longitude: countryBounds.getSouthWest().lng()
                                    }
                                }
                            });
                        });
                    }
                }} showMap={false}/>
                                {!singleSearchLocation && singleLocationCountry &&
                    <button onClick={() => {
                            setSingleSearchLocation((prevState) => {
                                return ({
                                    maxDistance: (prevState === null || prevState === void 0 ? void 0 : prevState.maxDistance) || lodash_1.default.toPairs(business_1.businessConfig.options.distance)[0][0].toString(),
                                    selectedLocation: {
                                        name: 'All Localities',
                                        country: singleLocationCountry
                                    },
                                    selectedCountry: singleLocationCountry,
                                    regionViewport: {
                                        high: {
                                            latitude: countryBounds.getNorthEast().lat(),
                                            longitude: countryBounds.getNorthEast().lng()
                                        },
                                        low: {
                                            latitude: countryBounds.getSouthWest().lat(),
                                            longitude: countryBounds.getSouthWest().lng()
                                        }
                                    }
                                });
                            });
                        }} className="all-localities">All Localities</button>}
                            </div>}
                        {singleSearchLocation &&
            <selected_single_location_display_1.default singleSearchLocation={singleSearchLocation} onRemove={() => setSingleSearchLocation(undefined)}/>}
                        {singleSearchLocation && singleSearchLocation.selectedLocation.name !== 'All Localities' &&
            <div className="input-container max-distance-container">
                                <label>Maximum Distance From Location</label>
                                <select onChange={(e) => {
                    setSingleLocationDistance(parseInt(e.target.value));
                    if (singleSearchLocation) {
                        setSingleSearchLocation(Object.assign(Object.assign({}, singleSearchLocation), { maxDistance: e.target.value.toString() }));
                    }
                }} value={singleLocationDistance} className="location-distance">
                                    {lodash_1.default.toPairs(business_1.businessConfig.options.distance).map(distance => <option key={distance[0].toString()} value={distance[0]}>{distance[1]}</option>)}
                                </select>
                            </div>}
                        <div className="input-container">
                            <button className="confirm-button" type="button" onClick={() => {
            // @ts-expect-error ad-hoc object composition
            onUpdate(Object.assign(Object.assign({}, (singleSearchLocation || {})), { maxDistance: singleLocationDistance }));
            onClose();
        }} disabled={!singleSearchLocation}>Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </material_1.Box>);
}
//# sourceMappingURL=single-location-dialog.jsx.map