import './age-range-select.scss';
import { businessConfig } from "@/config/business";
import _ from "lodash";
import { useState } from "react";

interface AgeRangeProps {
    minAge: number;
    maxAge: number;
    onChange?: (values: {minAge: number, maxAge: number}) => void;
}

export default function AgeRangeSelect({ minAge, maxAge, onChange }: AgeRangeProps) {

    const onMinAgeUpdate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const valueAsNumber = Number(e.target.value);
        const newMinAge = valueAsNumber > maxAge ? maxAge : valueAsNumber;
        if (onChange)
            onChange({minAge: newMinAge, maxAge});
    }

    const onMaxAgeUpdate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const valueAsNumber = Number(e.target.value);
        const newMaxAge = valueAsNumber < minAge ? minAge : valueAsNumber;
        if (onChange)
            onChange({minAge, maxAge: newMaxAge});
    }

    return (
        <div className="age-range-select-container">
            <div className="from-label">From</div>
            <select onChange={onMinAgeUpdate} value={minAge} className="from-select">
                {_.range(businessConfig.defaults.minAge, businessConfig.defaults.maxAge + 1).map(age =>
                    <option key={age.toString()} value={age}>{age}</option>)}
            </select>
            <div className="to-label">To</div>
            <select onChange={onMaxAgeUpdate} value={maxAge} className="to-select">
                {_.range(businessConfig.defaults.minAge, businessConfig.defaults.maxAge + 1).map(age =>
                    <option key={age.toString()} value={age}>{age}</option>)}
            </select>
        </div>
    );
}
