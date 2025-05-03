import './height-range-select.scss';
import { businessConfig } from "@/config/business";
import _ from "lodash";
import { useState } from "react";

interface HeightRangeProps {
    initialMinHeight: number;
    initialMaxHeight: number;
    onChange?: (values: { minHeight: number, maxHeight: number }) => void;
}

export default function HeightRangeSelect({ initialMinHeight, initialMaxHeight, onChange }: HeightRangeProps) {
    const [minHeight, setMinHeight] = useState(initialMinHeight);
    const [maxHeight, setMaxHeight] = useState(initialMaxHeight);

    const onMinHeightUpdate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const valueAsNumber = Number(e.target.value);
        const lMinHeight = valueAsNumber > maxHeight ? maxHeight : valueAsNumber;
        setMinHeight(lMinHeight);
        if (onChange)
            onChange({ minHeight: lMinHeight, maxHeight });
    }

    const onMaxHeightUpdate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const valueAsNumber = Number(e.target.value);
        const lMaxHeight = valueAsNumber < minHeight ? minHeight : valueAsNumber;
        setMaxHeight(lMaxHeight);
        if (onChange)
            onChange({ minHeight, maxHeight: lMaxHeight });
    }

    // Get all height values from the business config
    const heightOptions = Object.entries(businessConfig.options.height)
        .map(([heightCm, heightDisplay]) => ({
            value: parseInt(heightCm),
            display: `${heightDisplay} (${heightCm} cm)`
        }))
        .sort((a, b) => a.value - b.value);

    return (
        <div className="height-range-select-container">
            <div className="from-label">From</div>
            <select onChange={onMinHeightUpdate} value={minHeight} className="from-select">
                {heightOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.display}
                    </option>
                ))}
            </select>
            <div className="to-label">To</div>
            <select onChange={onMaxHeightUpdate} value={maxHeight} className="to-select">
                {heightOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.display}
                    </option>
                ))}
            </select>
        </div>
    );
}
