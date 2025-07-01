"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MultiCountrySelect;
const Box_1 = __importDefault(require("@mui/material/Box"));
require("./multi-country-select.scss");
const react_1 = require("react");
const react_line_awesome_1 = require("react-line-awesome");
const countries_1 = require("@/config/countries");
const MAX_COUNTRIES = 5;
function MultiCountrySelect({ selectedCountries = [], onUpdate, onClose }) {
    const [selected, setSelected] = (0, react_1.useState)(selectedCountries || []);
    const [error, setError] = (0, react_1.useState)(null);
    const handleToggleCountry = (countryName) => {
        if (selected.includes(countryName)) {
            setSelected(selected.filter(c => c !== countryName));
            setError(null);
        }
        else {
            if (selected.length >= MAX_COUNTRIES) {
                setError(`You can only select up to ${MAX_COUNTRIES} countries`);
                return;
            }
            setSelected([...selected, countryName]);
            setError(null);
        }
    };
    const handleSave = () => {
        onUpdate(selected);
        onClose();
    };
    return (<Box_1.default sx={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translate(-50%)',
            width: '40vw',
            maxWidth: 600,
            bgcolor: 'white',
            outlineWidth: 0,
            borderRadius: 1.5,
            boxShadow: 2
        }}>
            <div className="multi-country-select-container">
                <div className="title-section">
                    <h2>Select Countries</h2>
                    <div className="close-button-container">
                        <button onClick={onClose}>
                            <react_line_awesome_1.TimesIcon />
                        </button>
                    </div>
                </div>
                <div className="content-area">
                    {error && <div className="error-message">{error}</div>}
                    <div className="countries-list">
                        {countries_1.countries.map((country) => (<div key={country.code} className={`country-item ${selected.includes(country.name) ? 'selected' : ''} ${selected.length >= MAX_COUNTRIES &&
                !selected.includes(country.name) ? 'disabled' : ''}`} onClick={() => handleToggleCountry(country.name)}>
                                {country.name}
                            </div>))}
                    </div>

                    <div className="actions">
                        <div className="selected-count">
                            {selected.length} of {MAX_COUNTRIES} countries selected
                        </div>
                        <div className="buttons">
                            <button type="button" className="save-button" onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Box_1.default>);
}
//# sourceMappingURL=multi-country-select.jsx.map