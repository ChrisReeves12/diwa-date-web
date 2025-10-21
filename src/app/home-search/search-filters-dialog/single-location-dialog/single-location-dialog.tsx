import './single-location-dialog.scss';
import { Autocomplete, Box, MenuItem, Select, TextField } from "@mui/material";
import { countries } from "@/config/countries";
import LocationSearch from "@/common/location-search/location-search";
import { useState } from "react";
import { TimesIcon } from "react-line-awesome";
import _ from "lodash";
import { businessConfig } from "@/config/business";
import { SingleSearchLocation } from "@/types";
import SelectedSingleLocationDisplay
    from "@/app/home-search/search-filters-dialog/selected-single-location-display/selected-single-location-display";
import { getGeoBoundsForCountry } from "@/util";

interface SingleLocationDialogProps {
    onClose: () => void,
    onUpdate: (singleSearchLocation?: SingleSearchLocation) => void,
    defaultSingleSearchLocation?: SingleSearchLocation
}

export default function SingleLocationDialog({ onClose, onUpdate, defaultSingleSearchLocation }: SingleLocationDialogProps) {
    const [singleLocationDistance, setSingleLocationDistance] = useState<number>(100);
    const [singleLocationCountry, setSingleLocationCountry] = useState<string | null>(null);
    const [singleSearchLocation, setSingleSearchLocation] = useState<SingleSearchLocation | undefined>(defaultSingleSearchLocation);
    const [countryBounds, setCountryBounds] = useState<google.maps.LatLngBounds | undefined>();
    const innerWidth = window.innerWidth;

    return (
        <Box className="modal-background" sx={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translate(-50%)',
            width: innerWidth <= 768 ? '85vw' : '40vw',
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
                            <TimesIcon />
                        </button>
                    </div>
                </div>
                <div className="body-section">
                    <div className="form-section">
                        {!singleSearchLocation && <div className="input-container country">
                            <label>Country</label>
                            {innerWidth <= 768 ?
                                <Select
                                    value={singleLocationCountry || ''}
                                    onChange={async (e) => {
                                        const newValue = e.target.value || null;
                                        setSingleLocationCountry(newValue);
                                        const countryObj = countries.find(country => country.name === newValue);

                                        if (newValue && countryObj) {
                                            const geoCodeResult = await getGeoBoundsForCountry(countryObj);
                                            setCountryBounds(geoCodeResult.geometry.viewport);
                                        }
                                    }}
                                    displayEmpty
                                    sx={{ width: '100%' }}
                                >
                                    <MenuItem value="" disabled>Select Country</MenuItem>
                                    {countries.map(country => (
                                        <MenuItem key={country.code} value={country.name}>
                                            {country.name}
                                        </MenuItem>
                                    ))}
                                </Select> :
                                <Autocomplete
                                disablePortal
                                options={countries.map(country => country.name)}
                                sx={{ width: '100%' }}
                                value={singleLocationCountry}
                                onChange={async (_, newValue) => {
                                    setSingleLocationCountry(newValue);
                                    const countryObj = countries.find(country => country.name === newValue);

                                    if (newValue && countryObj) {
                                        const geoCodeResult = await getGeoBoundsForCountry(countryObj);
                                        setCountryBounds(geoCodeResult.geometry.viewport);
                                    }
                                }}
                                renderInput={(params) => <TextField {...params} placeholder="Select Country" />}
                            />}
                        </div>}
                        {countryBounds && !singleSearchLocation &&
                            <div className="inline-form-container">
                                <LocationSearch geoBounds={countryBounds}
                                    onUpdate={(locality) => {
                                        if (locality) {
                                            setSingleSearchLocation((prevState) => {
                                                return ({
                                                    maxDistance: prevState?.maxDistance || _.toPairs(businessConfig.options.distance)[0][0].toString(),
                                                    selectedLocation: locality,
                                                    selectedCountry: locality.country,
                                                    regionViewport: {
                                                        high: {
                                                            latitude: countryBounds!.getNorthEast().lat(),
                                                            longitude: countryBounds!.getNorthEast().lng()
                                                        },
                                                        low: {
                                                            latitude: countryBounds!.getSouthWest().lat(),
                                                            longitude: countryBounds!.getSouthWest().lng()
                                                        }
                                                    }
                                                });
                                            });
                                        }
                                    }}
                                    showMap={false} />
                                {!singleSearchLocation && singleLocationCountry &&
                                    <button onClick={() => {
                                        setSingleSearchLocation((prevState) => {
                                            return ({
                                                maxDistance: prevState?.maxDistance || _.toPairs(businessConfig.options.distance)[0][0].toString(),
                                                selectedLocation: {
                                                    name: 'All Localities',
                                                    country: singleLocationCountry
                                                },
                                                selectedCountry: singleLocationCountry,
                                                regionViewport: {
                                                    high: {
                                                        latitude: countryBounds!.getNorthEast().lat(),
                                                        longitude: countryBounds!.getNorthEast().lng()
                                                    },
                                                    low: {
                                                        latitude: countryBounds!.getSouthWest().lat(),
                                                        longitude: countryBounds!.getSouthWest().lng()
                                                    }
                                                }
                                            });
                                        });
                                    }} className="all-localities">All</button>}
                            </div>}
                        {singleSearchLocation &&
                            <SelectedSingleLocationDisplay
                                singleSearchLocation={singleSearchLocation}
                                onRemove={() => setSingleSearchLocation(undefined)}
                            />}
                        {singleSearchLocation && singleSearchLocation.selectedLocation.name !== 'All Localities' &&
                            <div className="input-container max-distance-container">
                                <label>Maximum Distance From Location</label>
                                <select onChange={(e) => {
                                    setSingleLocationDistance(parseInt(e.target.value));
                                    if (singleSearchLocation) {
                                        setSingleSearchLocation({
                                            ...singleSearchLocation,
                                            ...{ maxDistance: e.target.value.toString() }
                                        });
                                    }
                                }} value={singleLocationDistance} className="location-distance">
                                    {_.toPairs(businessConfig.options.distance).map(distance =>
                                        <option key={distance[0].toString()}
                                            value={distance[0]}>{distance[1]}</option>)}
                                </select>
                            </div>}
                        <div className="input-container">
                            <button
                                className="confirm-button"
                                type="button"
                                onClick={() => {
                                    // @ts-expect-error ad-hoc object composition
                                    onUpdate({
                                        ...(singleSearchLocation || {}),
                                        ...{ maxDistance: singleLocationDistance }
                                    });
                                    onClose();
                                }}
                                disabled={!singleSearchLocation}>Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Box>
    );
}
