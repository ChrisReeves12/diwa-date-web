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
exports.default = LocationSearch;
require("./location-search.scss");
const selected_map_location_1 = __importDefault(require("@/common/selected-map-location/selected-map-location"));
const react_1 = __importStar(require("react"));
const util_1 = require("@/util");
function LocationSearch({ onUpdate, error, initialLocality, geoBounds, showMap = true }) {
    const [locationSearchText, setLocationSearchText] = (0, react_1.useState)('');
    const [selectedLocation, setSelectedLocation] = (0, react_1.useState)(initialLocality);
    const [locationSuggestions, setLocationSuggestions] = (0, react_1.useState)([]);
    const [showSuggestions, setShowSuggestions] = (0, react_1.useState)(false);
    const [map, setMap] = (0, react_1.useState)(null);
    // @ts-expect-error Not a part of Google types
    const [marker, setMarker] = (0, react_1.useState)(null);
    const [autocompleteService, setAutocompleteService] = (0, react_1.useState)(null);
    // Initialize Google Maps
    (0, react_1.useEffect)(() => {
        const initMap = async () => {
            try {
                // @ts-expect-error Not part of Google types
                const { Map } = await google.maps.importLibrary("maps");
                // @ts-expect-error Not part of Google types
                const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
                await google.maps.importLibrary("places");
                const center = (initialLocality === null || initialLocality === void 0 ? void 0 : initialLocality.coordinates) ?
                    { lat: initialLocality.coordinates.latitude, lng: initialLocality.coordinates.longitude } :
                    { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines as default
                // Create a new map instance
                const mapInstance = new Map(document.getElementById("map"), {
                    center,
                    zoom: 9,
                    mapId: "LOCATION_MAP",
                    mapTypeControl: false,
                    streetViewControl: false,
                    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches
                        ? google.maps.ColorScheme.DARK
                        : google.maps.ColorScheme.LIGHT
                });
                // Create a marker for the selected location
                const markerInstance = new AdvancedMarkerElement({
                    position: center,
                    map: mapInstance,
                    title: 'My Location',
                    gmpDraggable: false,
                });
                // Initialize autocomplete service
                const autocomplete = new google.maps.places.AutocompleteService();
                // Update state with map, marker, and autocomplete instances
                setMap(mapInstance);
                setMarker(markerInstance);
                setAutocompleteService(autocomplete);
            }
            catch (error) {
                console.error("Error initializing Google Maps:", error);
            }
        };
        (0, util_1.loadGoogleMapsScript)();
        // Initialize map after script is loaded
        window.setTimeout(() => {
            initMap().then();
        }, 500);
    }, []);
    const convertGeocoderResultToLocality = (geocoderResult, description) => {
        var _a, _b, _c, _d;
        const city = (_a = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('locality'))) === null || _a === void 0 ? void 0 : _a.long_name;
        const regionLevel1 = (_b = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('administrative_area_level_1'))) === null || _b === void 0 ? void 0 : _b.long_name;
        const regionLevel2 = (_c = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('administrative_area_level_2'))) === null || _c === void 0 ? void 0 : _c.long_name;
        const country = (_d = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('country'))) === null || _d === void 0 ? void 0 : _d.long_name;
        if (!country) {
            console.error('Could not locate country.');
            alert('An error occurred while trying to locate the country of your location. Please try a different search.');
            throw Error('Could not locate country.');
        }
        return {
            name: description,
            coordinates: { latitude: geocoderResult.geometry.location.lat(), longitude: geocoderResult.geometry.location.lng() },
            city,
            region: country === 'Philippines' ? (regionLevel2 || regionLevel1) : (regionLevel1 || regionLevel2),
            country,
            viewport: {
                high: {
                    latitude: geocoderResult.geometry.viewport.getNorthEast().lat(),
                    longitude: geocoderResult.geometry.viewport.getNorthEast().lng()
                }, low: {
                    latitude: geocoderResult.geometry.viewport.getSouthWest().lat(),
                    longitude: geocoderResult.geometry.viewport.getSouthWest().lng()
                }
            }
        };
    };
    const geoCodeLocation = async (location, description) => {
        return new Promise((resolve, reject) => {
            google.maps.importLibrary("geocoding").then(library => {
                // @ts-expect-error dynamically loaded library
                const geocoder = new library.Geocoder();
                geocoder.geocode({ location }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                        const selectedLocality = convertGeocoderResultToLocality(results[0], description);
                        setSelectedLocation(selectedLocality);
                        if (onUpdate) {
                            onUpdate(selectedLocality);
                        }
                        resolve(results[0]);
                    }
                    else {
                        reject(new Error('Geocoding failed'));
                    }
                });
            });
        });
    };
    // Handle selection of a location suggestion
    const handleSelectLocation = (suggestion) => {
        setLocationSearchText(suggestion.description);
        setShowSuggestions(false);
        // Get details for the selected place to get coordinates
        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
        placesService.getDetails({ placeId: suggestion.place_id, fields: ['geometry'] }, async (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                await geoCodeLocation(place.geometry.location, suggestion.description);
                // Update map and marker
                if (map && marker) {
                    marker.position = place.geometry.location;
                    map.setCenter(place.geometry.location);
                    map.setZoom(14);
                }
            }
        });
    };
    // Handle location input change and fetch suggestions
    const handleLocationInputChange = (e) => {
        const value = e.target.value;
        setLocationSearchText(value);
        // If input is empty, clear suggestions
        if (!value.trim()) {
            setLocationSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        // Fetch location suggestions using Google Places Autocomplete
        if (autocompleteService) {
            autocompleteService.getPlacePredictions({
                input: value,
                types: ['locality', 'neighborhood', 'colloquial_area'],
                locationRestriction: geoBounds
            }, (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                    setLocationSuggestions(predictions);
                    setShowSuggestions(true);
                }
                else {
                    setLocationSuggestions([]);
                    setShowSuggestions(false);
                }
            });
        }
    };
    return (<div className="location-search-container">
            <div className="form-row">
                {selectedLocation
            && <selected_map_location_1.default onRemove={() => {
                    setSelectedLocation(undefined);
                    setLocationSearchText('');
                    if (onUpdate) {
                        onUpdate(undefined);
                    }
                }} location={selectedLocation}/>}
                {!selectedLocation && <div className={`input-container ${error ? 'error' : ''}`}>
                    <label htmlFor="location">Location</label>
                    <div className="location-input-container">
                        <input type="text" id="location" name="location" value={locationSearchText} onChange={handleLocationInputChange} onFocus={() => locationSearchText.trim() !== '' && setShowSuggestions(true)} onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
            }} className={error ? 'error' : ''} placeholder="City or Region" autoComplete="off"/>
                        {showSuggestions && locationSuggestions.length > 0 && (<div className="location-suggestions">
                                {locationSuggestions.map((suggestion) => (<div key={suggestion.place_id} className="suggestion-item" onClick={() => handleSelectLocation(suggestion)}>
                                        {suggestion.description}
                                    </div>))}
                            </div>)}
                    </div>
                    {error && (<div className="error-message">{error}</div>)}
                </div>}
            </div>
            <div style={{ display: selectedLocation && showMap ? 'block' : 'none' }} className="form-row">
                <div style={{ width: "100%", height: "480px", backgroundColor: "#f4f4f4", marginBottom: "40px" }} id="map"></div>
            </div>
        </div>);
}
//# sourceMappingURL=location-search.jsx.map