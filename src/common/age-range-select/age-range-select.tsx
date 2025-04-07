import './age-range-select.scss';
import { businessConfig } from "@/config/business";
import _ from "lodash";
import { ChangeEventHandler } from "react";

interface AgeRangeProps {
    minAge?: number;
    maxAge?: number;
    onMinAgeChange: ChangeEventHandler;
    onMaxAgeChange: ChangeEventHandler;
}

export default function AgeRangeSelect({ minAge, maxAge, onMinAgeChange, onMaxAgeChange }: AgeRangeProps) {
    return (
        <div className="age-range-select-container">
            <div className="from-label">From</div>
            <select onChange={onMinAgeChange} value={minAge || businessConfig.defaults.minAge} className="from-select">
                {_.range(businessConfig.defaults.minAge, businessConfig.defaults.maxAge + 1).map(age =>
                    <option key={age.toString()} value={age}>{age}</option>)}
            </select>
            <div className="to-label">To</div>
            <select onChange={onMaxAgeChange} value={maxAge || businessConfig.defaults.maxAge} className="to-select">
                {_.range(businessConfig.defaults.minAge, businessConfig.defaults.maxAge + 1).map(age =>
                    <option key={age.toString()} value={age}>{age}</option>)}
            </select>
        </div>
    );
}
