import './selected-map-location.scss';
import { TimesCircleIcon } from 'react-line-awesome';
import { Locality } from "@/types/locality.interface";

type SelectedMapLocationProps = {
    location: Locality;
    onRemove?: () => void;
};

export default function SelectedMapLocation({ location, onRemove }: SelectedMapLocationProps) {
    return (
        <div className="selected-map-location-container">
            <div className="info-section">
                <div className="label">Selected Location</div>
                <div className="formal-name">{location.name}</div>
                {location.coordinates &&
                    <div className="coords">{location.coordinates.latitude}, {location.coordinates.longitude}</div>}
            </div>
            <div className="remove-button-container">
                <button onClick={() => {
                    if (onRemove)
                        onRemove();
                }} title="Remove location" className="remove-button">
                    <TimesCircleIcon />
                </button>
            </div>
        </div>
    );
}
