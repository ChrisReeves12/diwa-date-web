import { GeoCoordinates } from "@/types/geo-coordinates.interface";
import { LocalityViewport } from "@/types/locality-viewport.interface";

export interface Locality {
    name: string;
    city?: string;
    region?: string;
    country: string;
    viewport?: LocalityViewport;
    coordinates?: GeoCoordinates;
}
