import './selected-single-location-display.scss';
import { TimesIcon } from "react-line-awesome";
import { SingleSearchLocation } from "@/types";
import { kilometersToMiles } from "@/util";

export default function SelectedSingleLocationDisplay({ singleSearchLocation, onRemove }:
{ singleSearchLocation: SingleSearchLocation, onRemove?: () => void }) {
    return (
        <div className="selected-single-location-display-container">
            <div className="location-info">
                <div className="location-name">{singleSearchLocation.selected_location.name}</div>
                <div className="location-country">{singleSearchLocation.selected_location.country}</div>
                {singleSearchLocation.selected_location.name !== 'All Localities' && singleSearchLocation.max_distance &&
                    <div className="location-distance">
                        Max Distance: {singleSearchLocation.max_distance} km / {kilometersToMiles(Number(singleSearchLocation.max_distance))} miles
                    </div>}
            </div>
            <div className="remove-button-container">
                <button onClick={() => onRemove ? onRemove() : null}>
                    <TimesIcon/>
                </button>
            </div>
        </div>
    );
}
