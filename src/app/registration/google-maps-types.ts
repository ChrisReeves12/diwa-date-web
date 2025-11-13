// Type definitions for Google Maps JavaScript API

// Declare the global window interface
declare global {
  interface Window {
    google: typeof google;
  }
}

// Export types for Google Maps
export interface MapOptions {
  center: { lat: number; lng: number } | google.maps.LatLng;
  zoom: number;
  mapId?: string;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
}

export interface MarkerOptions {
  map: google.maps.Map;
  position: { lat: number; lng: number } | google.maps.LatLng;
  draggable?: boolean;
}

export interface GeocoderRequest {
  address?: string;
  location?: google.maps.LatLng | { lat: number; lng: number };
}

export interface GeocoderResult {
  formatted_address: string;
  place_id: string;
  geometry: {
    location: google.maps.LatLng;
  };
}

export interface AutocompletionRequest {
  input: string;
}

export interface AutocompletePrediction {
  description: string;
  place_id: string;
}

export interface PlaceDetailsRequest {
  placeId: string;
  fields: string[];
}

export interface PlaceResult {
  geometry: {
    location: google.maps.LatLng;
  };
}

export interface GoogleMapsMouseEvent {
  latLng: google.maps.LatLng;
}

// Re-export Google Maps types
export type Map = google.maps.Map;
export type Marker = google.maps.Marker;
export type Geocoder = google.maps.Geocoder;
export type LatLng = google.maps.LatLng;
export type AutocompleteService = google.maps.places.AutocompleteService;
export type PlacesService = google.maps.places.PlacesService;
