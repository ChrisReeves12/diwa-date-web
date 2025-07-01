"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgeRangeSelect;
require("./age-range-select.scss");
const business_1 = require("@/config/business");
const lodash_1 = __importDefault(require("lodash"));
function AgeRangeSelect({ minAge, maxAge, onChange }) {
    const onMinAgeUpdate = (e) => {
        const valueAsNumber = Number(e.target.value);
        const newMinAge = valueAsNumber > maxAge ? maxAge : valueAsNumber;
        if (onChange)
            onChange({ minAge: newMinAge, maxAge });
    };
    const onMaxAgeUpdate = (e) => {
        const valueAsNumber = Number(e.target.value);
        const newMaxAge = valueAsNumber < minAge ? minAge : valueAsNumber;
        if (onChange)
            onChange({ minAge, maxAge: newMaxAge });
    };
    return (<div className="age-range-select-container">
            <div className="from-label">From</div>
            <select onChange={onMinAgeUpdate} value={minAge} className="from-select">
                {lodash_1.default.range(business_1.businessConfig.defaults.minAge, business_1.businessConfig.defaults.maxAge + 1).map(age => <option key={age.toString()} value={age}>{age}</option>)}
            </select>
            <div className="to-label">To</div>
            <select onChange={onMaxAgeUpdate} value={maxAge} className="to-select">
                {lodash_1.default.range(business_1.businessConfig.defaults.minAge, business_1.businessConfig.defaults.maxAge + 1).map(age => <option key={age.toString()} value={age}>{age}</option>)}
            </select>
        </div>);
}
//# sourceMappingURL=age-range-select.jsx.map