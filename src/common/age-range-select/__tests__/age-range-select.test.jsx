"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
require("@testing-library/jest-dom");
const age_range_select_1 = __importDefault(require("../age-range-select"));
// Mock the business config to make tests predictable
jest.mock('@/config/business', () => ({
    businessConfig: {
        defaults: {
            minAge: 18,
            maxAge: 65
        }
    }
}));
describe('AgeRangeSelect', () => {
    const defaultProps = {
        minAge: 25,
        maxAge: 35,
        onChange: jest.fn()
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Initial Rendering', () => {
        it('renders with correct initial values', () => {
            (0, react_1.render)(<age_range_select_1.default {...defaultProps}/>);
            const minSelect = react_1.screen.getByDisplayValue('25');
            const maxSelect = react_1.screen.getByDisplayValue('35');
            expect(minSelect).toBeInTheDocument();
            expect(maxSelect).toBeInTheDocument();
        });
        it('renders "From" and "To" labels', () => {
            (0, react_1.render)(<age_range_select_1.default {...defaultProps}/>);
            expect(react_1.screen.getByText('From')).toBeInTheDocument();
            expect(react_1.screen.getByText('To')).toBeInTheDocument();
        });
        it('generates all age options from business config', () => {
            (0, react_1.render)(<age_range_select_1.default {...defaultProps}/>);
            // Check that options from 18 to 65 are available
            const minSelect = react_1.screen.getByDisplayValue('25');
            const options = minSelect.querySelectorAll('option');
            // Should have 48 options (18-65 inclusive)
            expect(options).toHaveLength(48);
            expect(options[0]).toHaveValue('18');
            expect(options[47]).toHaveValue('65');
        });
        it('applies correct CSS classes', () => {
            (0, react_1.render)(<age_range_select_1.default {...defaultProps}/>);
            const container = react_1.screen.getByText('From').parentElement;
            const minSelect = react_1.screen.getByDisplayValue('25');
            const maxSelect = react_1.screen.getByDisplayValue('35');
            expect(container).toHaveClass('age-range-select-container');
            expect(minSelect).toHaveClass('from-select');
            expect(maxSelect).toHaveClass('to-select');
        });
    });
    describe('Min Age Changes', () => {
        it('calls onChange when min age is changed to valid value', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default {...defaultProps} onChange={onChange}/>);
            const minSelect = react_1.screen.getByDisplayValue('25');
            await user.selectOptions(minSelect, '30');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 30,
                maxAge: 35
            });
        });
        it('constrains min age to not exceed max age', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default minAge={25} maxAge={30} onChange={onChange}/>);
            const minSelect = react_1.screen.getByDisplayValue('25');
            // Try to set min age to 35 (higher than max age of 30)
            await user.selectOptions(minSelect, '35');
            // Should constrain to max age
            expect(onChange).toHaveBeenCalledWith({
                minAge: 30,
                maxAge: 30
            });
        });
        it('allows min age equal to max age', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default minAge={25} maxAge={35} onChange={onChange}/>);
            const minSelect = react_1.screen.getByDisplayValue('25');
            await user.selectOptions(minSelect, '35');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 35,
                maxAge: 35
            });
        });
        it('works without onChange callback', async () => {
            const user = user_event_1.default.setup();
            // Should not crash when onChange is undefined
            (0, react_1.render)(<age_range_select_1.default minAge={25} maxAge={35}/>);
            const minSelect = react_1.screen.getByDisplayValue('25');
            await expect(user.selectOptions(minSelect, '30')).resolves.not.toThrow();
        });
    });
    describe('Max Age Changes', () => {
        it('calls onChange when max age is changed to valid value', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default {...defaultProps} onChange={onChange}/>);
            const maxSelect = react_1.screen.getByDisplayValue('35');
            await user.selectOptions(maxSelect, '40');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 25,
                maxAge: 40
            });
        });
        it('constrains max age to not go below min age', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default minAge={30} maxAge={35} onChange={onChange}/>);
            const maxSelect = react_1.screen.getByDisplayValue('35');
            // Try to set max age to 25 (lower than min age of 30)
            await user.selectOptions(maxSelect, '25');
            // Should constrain to min age
            expect(onChange).toHaveBeenCalledWith({
                minAge: 30,
                maxAge: 30
            });
        });
        it('allows max age equal to min age', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default minAge={25} maxAge={35} onChange={onChange}/>);
            const maxSelect = react_1.screen.getByDisplayValue('35');
            await user.selectOptions(maxSelect, '25');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 25,
                maxAge: 25
            });
        });
        it('works without onChange callback', async () => {
            const user = user_event_1.default.setup();
            // Should not crash when onChange is undefined
            (0, react_1.render)(<age_range_select_1.default minAge={25} maxAge={35}/>);
            const maxSelect = react_1.screen.getByDisplayValue('35');
            await expect(user.selectOptions(maxSelect, '40')).resolves.not.toThrow();
        });
    });
    describe('Edge Cases', () => {
        it('handles boundary values correctly', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default minAge={18} maxAge={65} onChange={onChange}/>);
            // Test minimum boundary
            const minSelect = react_1.screen.getByDisplayValue('18');
            await user.selectOptions(minSelect, '18');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 18,
                maxAge: 65
            });
            // Test maximum boundary  
            const maxSelect = react_1.screen.getByDisplayValue('65');
            await user.selectOptions(maxSelect, '65');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 18,
                maxAge: 65
            });
        });
        it('handles same min and max ages', () => {
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default minAge={30} maxAge={30} onChange={onChange}/>);
            // When both selects have the same value, we should find exactly 2 elements
            const selectsWithSameValue = react_1.screen.getAllByDisplayValue('30');
            expect(selectsWithSameValue).toHaveLength(2);
            // Verify they are both select elements
            selectsWithSameValue.forEach(select => {
                expect(select.tagName).toBe('SELECT');
            });
        });
        it('maintains constraint when switching between values', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default minAge={25} maxAge={35} onChange={onChange}/>);
            // First change min to higher value
            const minSelect = react_1.screen.getByDisplayValue('25');
            await user.selectOptions(minSelect, '40');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 35, // constrained to max
                maxAge: 35
            });
            // Then change max to lower value (constrains against original minAge prop of 25)
            const maxSelect = react_1.screen.getByDisplayValue('35');
            await user.selectOptions(maxSelect, '20');
            expect(onChange).toHaveBeenCalledWith({
                minAge: 25, // original minAge prop
                maxAge: 25 // constrained to original minAge
            });
        });
    });
    describe('User Interactions', () => {
        it('fires onChange multiple times for multiple changes', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default {...defaultProps} onChange={onChange}/>);
            const minSelect = react_1.screen.getByDisplayValue('25');
            const maxSelect = react_1.screen.getByDisplayValue('35');
            await user.selectOptions(minSelect, '28');
            await user.selectOptions(maxSelect, '45');
            await user.selectOptions(minSelect, '30');
            expect(onChange).toHaveBeenCalledTimes(3);
            expect(onChange).toHaveBeenNthCalledWith(1, { minAge: 28, maxAge: 35 });
            // Second call constrains against original minAge prop (25)
            expect(onChange).toHaveBeenNthCalledWith(2, { minAge: 25, maxAge: 45 });
            expect(onChange).toHaveBeenNthCalledWith(3, { minAge: 30, maxAge: 35 }); // constrains against original maxAge prop
        });
        it('handles rapid successive changes', async () => {
            const user = user_event_1.default.setup();
            const onChange = jest.fn();
            (0, react_1.render)(<age_range_select_1.default {...defaultProps} onChange={onChange}/>);
            const minSelect = react_1.screen.getByDisplayValue('25');
            // Rapidly change values
            await user.selectOptions(minSelect, '26');
            await user.selectOptions(minSelect, '27');
            await user.selectOptions(minSelect, '28');
            expect(onChange).toHaveBeenCalledTimes(3);
            expect(onChange).toHaveBeenLastCalledWith({ minAge: 28, maxAge: 35 });
        });
    });
});
//# sourceMappingURL=age-range-select.test.jsx.map