"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HeightRangeSelect;
require("./height-range-select.scss");
const business_1 = require("@/config/business");
const react_1 = require("react");
function HeightRangeSelect({ initialMinHeight, initialMaxHeight, onChange }) {
    const [minHeight, setMinHeight] = (0, react_1.useState)(initialMinHeight);
    const [maxHeight, setMaxHeight] = (0, react_1.useState)(initialMaxHeight);
    const onMinHeightUpdate = (e) => {
        const valueAsNumber = Number(e.target.value);
        const lMinHeight = valueAsNumber > maxHeight ? maxHeight : valueAsNumber;
        setMinHeight(lMinHeight);
        if (onChange)
            onChange({ minHeight: lMinHeight, maxHeight });
    };
    const onMaxHeightUpdate = (e) => {
        const valueAsNumber = Number(e.target.value);
        const lMaxHeight = valueAsNumber < minHeight ? minHeight : valueAsNumber;
        setMaxHeight(lMaxHeight);
        if (onChange)
            onChange({ minHeight, maxHeight: lMaxHeight });
    };
    // Get all height values from the business config
    const heightOptions = Object.entries(business_1.businessConfig.options.height)
        .map(([heightCm, heightDisplay]) => ({
        value: parseInt(heightCm),
        display: `${heightDisplay} (${heightCm} cm)`
    }))
        .sort((a, b) => a.value - b.value);
    return (<div className="height-range-select-container">
            <div className="from-label">From</div>
            <select onChange={onMinHeightUpdate} value={minHeight} className="from-select">
                {heightOptions.map(option => (<option key={option.value} value={option.value}>
                        {option.display}
                    </option>))}
            </select>
            <div className="to-label">To</div>
            <select onChange={onMaxHeightUpdate} value={maxHeight} className="to-select">
                {heightOptions.map(option => (<option key={option.value} value={option.value}>
                        {option.display}
                    </option>))}
            </select>
        </div>);
}
//# sourceMappingURL=height-range-select.jsx.map