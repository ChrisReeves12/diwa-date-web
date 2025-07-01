"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SelectedSingleLocationDisplay;
require("./selected-single-location-display.scss");
const react_line_awesome_1 = require("react-line-awesome");
const util_1 = require("@/util");
function SelectedSingleLocationDisplay({ singleSearchLocation, onRemove }) {
    return (<div className="selected-single-location-display-container">
            <div className="location-info">
                <div className="location-name">{singleSearchLocation.selectedLocation.name}</div>
                <div className="location-country">{singleSearchLocation.selectedLocation.country}</div>
                {singleSearchLocation.selectedLocation.name !== 'All Localities' && singleSearchLocation.maxDistance &&
            <div className="location-distance">
                        Max Distance: {singleSearchLocation.maxDistance} km / {(0, util_1.kilometersToMiles)(Number(singleSearchLocation.maxDistance))} miles
                    </div>}
            </div>
            <div className="remove-button-container">
                <button onClick={() => onRemove ? onRemove() : null}>
                    <react_line_awesome_1.TimesIcon />
                </button>
            </div>
        </div>);
}
//# sourceMappingURL=selected-single-location-display.jsx.map