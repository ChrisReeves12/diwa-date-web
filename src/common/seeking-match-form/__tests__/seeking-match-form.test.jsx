"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const seeking_match_form_1 = __importDefault(require("../seeking-match-form"));
describe('SeekingMatchForm', () => {
    it('should render initial state correctly', () => {
        (0, react_1.render)(<seeking_match_form_1.default submitButtonLabel="Browse Singles"/>);
        // Check that all elements are present
        expect(react_1.screen.getByText('I am a')).toBeInTheDocument();
        expect(react_1.screen.getByText('looking for a')).toBeInTheDocument();
        expect(react_1.screen.getAllByText('Man')).toHaveLength(2);
        expect(react_1.screen.getAllByText('Woman')).toHaveLength(2);
        // Submit button should be disabled initially
        const submitButton = react_1.screen.getByRole('button', { name: 'Browse Singles' });
        expect(submitButton).toBeDisabled();
    });
    it('should handle user sex selection', async () => {
        const user = user_event_1.default.setup();
        (0, react_1.render)(<seeking_match_form_1.default submitButtonLabel="Browse Singles"/>);
        // Click on "Man" in the "I am a" section
        const maleOption = react_1.screen.getAllByText('Man')[0].closest('.radio-button-container');
        await user.click(maleOption);
        // Check that the option is selected
        expect(maleOption).toHaveClass('selected');
        // Button should still be disabled because we haven't selected seeking preference
        const submitButton = react_1.screen.getByRole('button', { name: 'Browse Singles' });
        expect(submitButton).toBeDisabled();
    });
    it('should handle seeking preference selection', async () => {
        const user = user_event_1.default.setup();
        (0, react_1.render)(<seeking_match_form_1.default submitButtonLabel="Browse Singles"/>);
        // Click on "Woman" in the "looking for a" section
        const femaleSeekingOption = react_1.screen.getAllByText('Woman')[1].closest('.radio-button-container');
        await user.click(femaleSeekingOption);
        // Check that the option is selected
        expect(femaleSeekingOption).toHaveClass('selected');
        // Button should still be disabled because we haven't selected user sex
        const submitButton = react_1.screen.getByRole('button', { name: 'Browse Singles' });
        expect(submitButton).toBeDisabled();
    });
    it('should enable submit button when both selections are made', async () => {
        const user = user_event_1.default.setup();
        (0, react_1.render)(<seeking_match_form_1.default submitButtonLabel="Browse Singles"/>);
        // Select "I am a Man"
        const maleOption = react_1.screen.getAllByText('Man')[0].closest('.radio-button-container');
        await user.click(maleOption);
        // Select "looking for a Woman"
        const femaleSeekingOption = react_1.screen.getAllByText('Woman')[1].closest('.radio-button-container');
        await user.click(femaleSeekingOption);
        // Now button should be enabled
        const submitButton = react_1.screen.getByRole('button', { name: 'Browse Singles' });
        expect(submitButton).not.toBeDisabled();
    });
    it('should call onUpdate callback when selections change', async () => {
        const mockOnUpdate = jest.fn();
        const user = user_event_1.default.setup();
        (0, react_1.render)(<seeking_match_form_1.default submitButtonLabel="Browse Singles" onUpdate={mockOnUpdate}/>);
        // Select "I am a Woman"
        const femaleOption = react_1.screen.getAllByText('Woman')[0].closest('.radio-button-container');
        await user.click(femaleOption);
        // Callback should be called with userSex
        expect(mockOnUpdate).toHaveBeenCalledWith({
            userSex: 'female',
            userSexSeeking: undefined
        });
        // Select "looking for a Man"
        const maleSeekingOption = react_1.screen.getAllByText('Man')[1].closest('.radio-button-container');
        await user.click(maleSeekingOption);
        // Callback should be called again with both values
        expect(mockOnUpdate).toHaveBeenCalledWith({
            userSex: 'female',
            userSexSeeking: 'male'
        });
    });
    it('should render with initial values', () => {
        (0, react_1.render)(<seeking_match_form_1.default initialUserSex="male" initialUserSexSeeking="female" submitButtonLabel="Browse Singles"/>);
        // Check that the initial selections are shown
        const maleOption = react_1.screen.getAllByText('Man')[0].closest('.radio-button-container');
        const femaleSeekingOption = react_1.screen.getAllByText('Woman')[1].closest('.radio-button-container');
        expect(maleOption).toHaveClass('selected');
        expect(femaleSeekingOption).toHaveClass('selected');
        // Submit button should be enabled
        const submitButton = react_1.screen.getByRole('button', { name: 'Browse Singles' });
        expect(submitButton).not.toBeDisabled();
    });
    it('should show error states', () => {
        (0, react_1.render)(<seeking_match_form_1.default userSexError="Please select your gender" userSexSeekingError="Please select your preference" submitButtonLabel="Browse Singles"/>);
        // Check that error classes are applied
        const choiceContainers = react_1.screen.getAllByText('I am a')[0]
            .closest('.radio-button-section')
            .querySelectorAll('.choice-container');
        expect(choiceContainers[0]).toHaveClass('error');
        expect(choiceContainers[1]).toHaveClass('error');
    });
    it('should handle switching selections', async () => {
        const user = user_event_1.default.setup();
        (0, react_1.render)(<seeking_match_form_1.default submitButtonLabel="Browse Singles"/>);
        // First select Man
        const maleOption = react_1.screen.getAllByText('Man')[0].closest('.radio-button-container');
        await user.click(maleOption);
        expect(maleOption).toHaveClass('selected');
        // Then select Woman (should deselect Man)
        const femaleOption = react_1.screen.getAllByText('Woman')[0].closest('.radio-button-container');
        await user.click(femaleOption);
        expect(femaleOption).toHaveClass('selected');
        expect(maleOption).not.toHaveClass('selected');
    });
    it('should work without submit button', () => {
        (0, react_1.render)(<seeking_match_form_1.default />);
        // Should render without submit button
        expect(react_1.screen.queryByRole('button')).not.toBeInTheDocument();
        // But form elements should still be there
        expect(react_1.screen.getByText('I am a')).toBeInTheDocument();
        expect(react_1.screen.getByText('looking for a')).toBeInTheDocument();
    });
});
//# sourceMappingURL=seeking-match-form.test.jsx.map