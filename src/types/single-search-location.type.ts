import { LocalityViewport } from "./locality-viewport.interface";

/**
 * Defines the structure for single search location data
 */
export type SingleSearchLocation = {
  max_distance: string;
  local_viewport: LocalityViewport;
  selected_country: string;
  selected_location: {
    id: string;
    region: string;
    formatted_name: string;
  };
};
