import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SeekingMatchForm from '../seeking-match-form'

describe('SeekingMatchForm', () => {
    it('should render initial state correctly', () => {
        render(<SeekingMatchForm submitButtonLabel="Browse Singles" />)

        // Check that all elements are present
        expect(screen.getByText('I am a')).toBeInTheDocument()
        expect(screen.getByText('looking for a')).toBeInTheDocument()
        expect(screen.getAllByText('Man')).toHaveLength(2)
        expect(screen.getAllByText('Woman')).toHaveLength(2)

        // Submit button should be disabled initially
        const submitButton = screen.getByRole('button', { name: 'Browse Singles' })
        expect(submitButton).toBeDisabled()
    })

    it('should handle user sex selection', async () => {
        const user = userEvent.setup()
        render(<SeekingMatchForm submitButtonLabel="Browse Singles" />)

        // Click on "Man" in the "I am a" section
        const maleOption = screen.getAllByText('Man')[0].closest('.radio-button-container')!
        await user.click(maleOption)

        // Check that the option is selected
        expect(maleOption).toHaveClass('selected')

        // Button should still be disabled because we haven't selected seeking preference
        const submitButton = screen.getByRole('button', { name: 'Browse Singles' })
        expect(submitButton).toBeDisabled()
    })

    it('should handle seeking preference selection', async () => {
        const user = userEvent.setup()
        render(<SeekingMatchForm submitButtonLabel="Browse Singles" />)

        // Click on "Woman" in the "looking for a" section
        const femaleSeekingOption = screen.getAllByText('Woman')[1].closest('.radio-button-container')!
        await user.click(femaleSeekingOption)

        // Check that the option is selected
        expect(femaleSeekingOption).toHaveClass('selected')

        // Button should still be disabled because we haven't selected user sex
        const submitButton = screen.getByRole('button', { name: 'Browse Singles' })
        expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when both selections are made', async () => {
        const user = userEvent.setup()
        render(<SeekingMatchForm submitButtonLabel="Browse Singles" />)

        // Select "I am a Man"
        const maleOption = screen.getAllByText('Man')[0].closest('.radio-button-container')!
        await user.click(maleOption)

        // Select "looking for a Woman"
        const femaleSeekingOption = screen.getAllByText('Woman')[1].closest('.radio-button-container')!
        await user.click(femaleSeekingOption)

        // Now button should be enabled
        const submitButton = screen.getByRole('button', { name: 'Browse Singles' })
        expect(submitButton).not.toBeDisabled()
    })

    it('should call onUpdate callback when selections change', async () => {
        const mockOnUpdate = jest.fn()
        const user = userEvent.setup()

        render(
            <SeekingMatchForm
                submitButtonLabel="Browse Singles"
                onUpdate={mockOnUpdate}
            />
        )

        // Select "I am a Woman"
        const femaleOption = screen.getAllByText('Woman')[0].closest('.radio-button-container')!
        await user.click(femaleOption)

        // Callback should be called with userSex
        expect(mockOnUpdate).toHaveBeenCalledWith({
            userSex: 'female',
            userSexSeeking: undefined
        })

        // Select "looking for a Man"
        const maleSeekingOption = screen.getAllByText('Man')[1].closest('.radio-button-container')!
        await user.click(maleSeekingOption)

        // Callback should be called again with both values
        expect(mockOnUpdate).toHaveBeenCalledWith({
            userSex: 'female',
            userSexSeeking: 'male'
        })
    })

    it('should render with initial values', () => {
        render(
            <SeekingMatchForm
                initialUserSex="male"
                initialUserSexSeeking="female"
                submitButtonLabel="Browse Singles"
            />
        )

        // Check that the initial selections are shown
        const maleOption = screen.getAllByText('Man')[0].closest('.radio-button-container')!
        const femaleSeekingOption = screen.getAllByText('Woman')[1].closest('.radio-button-container')!

        expect(maleOption).toHaveClass('selected')
        expect(femaleSeekingOption).toHaveClass('selected')

        // Submit button should be enabled
        const submitButton = screen.getByRole('button', { name: 'Browse Singles' })
        expect(submitButton).not.toBeDisabled()
    })

    it('should show error states', () => {
        render(
            <SeekingMatchForm
                userSexError="Please select your gender"
                userSexSeekingError="Please select your preference"
                submitButtonLabel="Browse Singles"
            />
        )

        // Check that error classes are applied
        const choiceContainers = screen.getAllByText('I am a')[0]
            .closest('.radio-button-section')!
            .querySelectorAll('.choice-container')

        expect(choiceContainers[0]).toHaveClass('error')
        expect(choiceContainers[1]).toHaveClass('error')
    })

    it('should handle switching selections', async () => {
        const user = userEvent.setup()
        render(<SeekingMatchForm submitButtonLabel="Browse Singles" />)

        // First select Man
        const maleOption = screen.getAllByText('Man')[0].closest('.radio-button-container')!
        await user.click(maleOption)
        expect(maleOption).toHaveClass('selected')

        // Then select Woman (should deselect Man)
        const femaleOption = screen.getAllByText('Woman')[0].closest('.radio-button-container')!
        await user.click(femaleOption)

        expect(femaleOption).toHaveClass('selected')
        expect(maleOption).not.toHaveClass('selected')
    })

    it('should work without submit button', () => {
        render(<SeekingMatchForm />)

        // Should render without submit button
        expect(screen.queryByRole('button')).not.toBeInTheDocument()

        // But form elements should still be there
        expect(screen.getByText('I am a')).toBeInTheDocument()
        expect(screen.getByText('looking for a')).toBeInTheDocument()
    })
}) 