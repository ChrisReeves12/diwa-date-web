"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SelectedMapLocation;
require("./selected-map-location.scss");
const react_line_awesome_1 = require("react-line-awesome");
function SelectedMapLocation({ location, onRemove }) {
    return (<div className="selected-map-location-container">
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
                    <react_line_awesome_1.TimesCircleIcon />
                </button>
            </div>
        </div>);
}
//# sourceMappingURL=selected-map-location.jsx.map