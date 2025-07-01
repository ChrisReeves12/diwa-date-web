"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MultiSelect;
const react_1 = require("react");
require("./multi-select.scss");
function MultiSelect({ options, selectedValues, onChange, maxSelections, placeholder = "Select options...", label, error }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const wrapperRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            // Use a timeout to ensure the click event that opened the dropdown has finished
            const timeoutId = setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 0);
            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [isOpen]);
    const handleToggleOption = (value) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        }
        else if (!maxSelections || selectedValues.length < maxSelections) {
            onChange([...selectedValues, value]);
        }
    };
    const getDisplayText = () => {
        if (selectedValues.length === 0)
            return placeholder;
        if (selectedValues.length === 1) {
            const option = options.find(opt => opt.value === selectedValues[0]);
            return option ? option.label : selectedValues[0];
        }
        return `${selectedValues.length} selected`;
    };
    return (<div className={`multi-select-container ${error ? 'error' : ''}`}>
            <label>{label}</label>
            <div className="multi-select-wrapper" ref={wrapperRef}>
                <div className={`multi-select-display ${isOpen ? 'open' : ''}`} onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}>
                    <span className="display-text">{getDisplayText()}</span>
                    <i className={`las la-chevron-down ${isOpen ? 'rotated' : ''}`}></i>
                </div>
                
                {isOpen && (<div className="multi-select-dropdown">
                        {options.map(option => (<div key={option.value} className={`option ${selectedValues.includes(option.value) ? 'selected' : ''} ${maxSelections && selectedValues.length >= maxSelections && !selectedValues.includes(option.value) ? 'disabled' : ''}`} onClick={(e) => {
                    e.stopPropagation();
                    handleToggleOption(option.value);
                }}>
                                <div className="option-content">
                                    {option.emoji && <span className="emoji">{option.emoji}</span>}
                                    <span className="label">{option.label}</span>
                                </div>
                                {selectedValues.includes(option.value) && (<i className="las la-check"></i>)}
                            </div>))}
                    </div>)}
            </div>
            
            {maxSelections && (<div className="selection-counter">
                    {selectedValues.length}/{maxSelections} selected
                </div>)}
            
            {error && (<div className="error-message">{error}</div>)}
        </div>);
}
//# sourceMappingURL=multi-select.jsx.map