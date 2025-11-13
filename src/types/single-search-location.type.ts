import { LocalityViewport } from "./locality-viewport.interface";
import { Locality } from "@/types/locality.interface";

/**
 * Defines the structure for single search location data
 */
export type SingleSearchLocation = {
  maxDistance: string;
  regionViewport: LocalityViewport;
  selectedCountry: string;
  selectedLocation: Locality;
};
