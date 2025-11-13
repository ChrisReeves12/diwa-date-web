import './selected-single-location-display.scss';
import { TimesIcon } from "react-line-awesome";
import { SingleSearchLocation } from "@/types";
import { kilometersToMiles } from "@/util";

export default function SelectedSingleLocationDisplay({ singleSearchLocation, onRemove }:
    { singleSearchLocation: SingleSearchLocation, onRemove?: () => void }) {
    return (
        <div className="selected-single-location-display-container">
            <div className="location-info">
                <div className="location-name">{singleSearchLocation.selectedLocation.name}</div>
                <div className="location-country">{singleSearchLocation.selectedLocation.country}</div>
                {singleSearchLocation.selectedLocation.name !== 'All Localities' && singleSearchLocation.maxDistance &&
                    <div className="location-distance">
                        Max Distance: {singleSearchLocation.maxDistance} km / {kilometersToMiles(Number(singleSearchLocation.maxDistance))} miles
                    </div>}
            </div>
            <div className="remove-button-container">
                <button onClick={() => onRemove ? onRemove() : null}>
                    <TimesIcon />
                </button>
            </div>
        </div>
    );
}
