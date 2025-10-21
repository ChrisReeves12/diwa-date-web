'use client';

import './location-search.scss';
import SelectedMapLocation from "@/common/selected-map-location/selected-map-location";
import React, { useEffect, useState } from "react";
import { Locality } from "@/types/locality.interface";
import { loadGoogleMapsScript, showAlert } from "@/util";

interface LocationSearchProps {
    onUpdate?: (locality?: Locality) => void;
    error?: string;
    initialLocality?: Locality;
    label?: string;
    geoBounds?: google.maps.LatLngBounds;
    showMap?: boolean;
}


export default function LocationSearch({ onUpdate, error, initialLocality, geoBounds, showMap = true, label }: LocationSearchProps) {
    const [locationSearchText, setLocationSearchText] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<Locality | undefined>(initialLocality);
    const [locationSuggestions, setLocationSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    // @ts-expect-error Not a part of Google types
    const [marker, setMarker] = useState<google.maps.AdvancedMarkerElement | null>(null);
    const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);

    // Initialize Google Maps
    useEffect(() => {
        const initMap = async () => {
            try {
                // @ts-expect-error Not part of Google types
                const { Map } = await google.maps.importLibrary("maps");
                // @ts-expect-error Not part of Google types
                const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
                await google.maps.importLibrary("places");

                const center = initialLocality?.coordinates ?
                    { lat: initialLocality.coordinates.latitude, lng: initialLocality.coordinates.longitude } :
                    { lat: 14.5995, lng: 120.9842 }; // Manila, Philippines as default

                // Create a new map instance
                const mapInstance = new Map(document.getElementById("map") as HTMLElement, {
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
            } catch (error) {
                console.error("Error initializing Google Maps:", error);
            }
        };

        loadGoogleMapsScript();

        // Initialize map after script is loaded
        window.setTimeout(() => {
            initMap().then();
        }, 500);
    }, []);

    const convertGeocoderResultToLocality = (geocoderResult: google.maps.GeocoderResult, description: string): Locality => {
        const city = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('locality'))?.long_name;
        const regionLevel1 = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('administrative_area_level_1'))?.long_name;
        const regionLevel2 = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('administrative_area_level_2'))?.long_name;
        const country = geocoderResult.address_components.find(addrComponent => addrComponent.types.includes('country'))?.long_name;

        if (!country) {
            console.error('Could not locate country.');
            showAlert('An error occurred while trying to locate the country of your location. Please try a different search.');
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
    }

    const geoCodeLocation = async (location: google.maps.LatLng, description: string) => {
        return new Promise<google.maps.GeocoderResult>((resolve, reject) => {
            google.maps.importLibrary("geocoding").then(library => {
                // @ts-expect-error dynamically loaded library
                const geocoder = new library.Geocoder();
                geocoder.geocode({ location }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                        const selectedLocality = convertGeocoderResultToLocality(results[0], description);
                        setSelectedLocation(selectedLocality);
                        if (onUpdate) {
                            onUpdate(selectedLocality);
                        }

                        resolve(results[0]);
                    } else {
                        reject(new Error('Geocoding failed'));
                    }
                });
            });
        })
    };

    // Handle selection of a location suggestion
    const handleSelectLocation = (suggestion: google.maps.places.AutocompletePrediction) => {
        setLocationSearchText(suggestion.description);
        setShowSuggestions(false);

        // Get details for the selected place to get coordinates
        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
        placesService.getDetails(
            { placeId: suggestion.place_id, fields: ['geometry'] },
            async (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                    await geoCodeLocation(place.geometry.location, suggestion.description);

                    // Update map and marker
                    if (map && marker) {
                        marker.position = place.geometry.location;
                        map.setCenter(place.geometry.location);
                        map.setZoom(14);
                    }
                }
            }
        );
    };

    // Handle location input change and fetch suggestions
    const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            autocompleteService.getPlacePredictions(
                {
                    input: value,
                    types: ['locality', 'neighborhood', 'colloquial_area'],
                    locationRestriction: geoBounds
                },
                (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                        setLocationSuggestions(predictions);
                        setShowSuggestions(true);
                    } else {
                        setLocationSuggestions([]);
                        setShowSuggestions(false);
                    }
                }
            );
        }
    };

    return (
        <div className="location-search-container">
            <div className="form-row">
                {selectedLocation
                    && <SelectedMapLocation onRemove={() => {
                        setSelectedLocation(undefined);
                        setLocationSearchText('');
                        if (onUpdate) {
                            onUpdate(undefined);
                        }
                    }} location={selectedLocation} />}
                {!selectedLocation && <div className={`input-container ${error ? 'error' : ''}`}>
                    <label htmlFor="location">{label || 'Location'}</label>
                    <div className="location-input-container">
                        <input
                            type="text"
                            id="location"
                            name="location"
                            value={locationSearchText}
                            onChange={handleLocationInputChange}
                            onFocus={() => locationSearchText.trim() !== '' && setShowSuggestions(true)}
                            onBlur={() => {
                                setTimeout(() => setShowSuggestions(false), 200);
                            }}
                            className={error ? 'error' : ''}
                            placeholder="City or Region"
                            autoComplete="off"
                        />
                        {showSuggestions && locationSuggestions.length > 0 && (
                            <div className="location-suggestions">
                                {locationSuggestions.map((suggestion) => (
                                    <div
                                        key={suggestion.place_id}
                                        className="suggestion-item"
                                        onClick={() => handleSelectLocation(suggestion)}
                                    >
                                        {suggestion.description}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {error && (
                        <div className="error-message">{error}</div>
                    )}
                </div>}
            </div>
            <div style={{ display: selectedLocation && showMap ? 'block' : 'none' }} className="form-row">
                <div style={{ width: "100%", height: "480px", backgroundColor: "#f4f4f4", marginBottom: "40px" }} id="map"></div>
            </div>
        </div>
    );
}
