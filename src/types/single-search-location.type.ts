import { LocalityViewport } from "./locality-viewport.interface";
import { Locality } from "@/types/locality.interface";

/**
 * Defines the structure for single search location data
 */
export type SingleSearchLocation = {
  max_distance: string;
  region_viewport: LocalityViewport;
  selected_country: string;
  selected_location: Locality;
};
