import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HeightRangeSelect from '../height-range-select';
import { businessConfig } from '@/config/business';

// Mock the business config to make tests predictable
jest.mock('@/config/business', () => ({
    businessConfig: {
        options: {
            height: {
                '150': '4\'11"',
                '155': '5\'1"',
                '160': '5\'3"',
                '165': '5\'5"',
                '170': '5\'7"',
                '175': '5\'9"',
                '180': '5\'11"',
                '185': '6\'1"',
                '190': '6\'3"',
                '195': '6\'5"'
            }
        }
    }
}));

describe('HeightRangeSelect', () => {
    const defaultProps = {
        initialMinHeight: 160,
        initialMaxHeight: 180,
        onChange: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initial Rendering', () => {
        it('renders with correct initial values', () => {
            render(<HeightRangeSelect {...defaultProps} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');

            expect(minSelect).toBeInTheDocument();
            expect(maxSelect).toBeInTheDocument();
        });

        it('renders "From" and "To" labels', () => {
            render(<HeightRangeSelect {...defaultProps} />);

            expect(screen.getByText('From')).toBeInTheDocument();
            expect(screen.getByText('To')).toBeInTheDocument();
        });

        it('generates all height options from business config', () => {
            render(<HeightRangeSelect {...defaultProps} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            const options = minSelect.querySelectorAll('option');

            // Should have 10 options based on mocked config
            expect(options).toHaveLength(10);
            expect(options[0]).toHaveValue('150');
            expect(options[9]).toHaveValue('195');
        });

        it('applies correct CSS classes', () => {
            render(<HeightRangeSelect {...defaultProps} />);

            const container = screen.getByText('From').parentElement;
            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');

            expect(container).toHaveClass('height-range-select-container');
            expect(minSelect).toHaveClass('from-select');
            expect(maxSelect).toHaveClass('to-select');
        });

        it('displays height options with correct format', () => {
            render(<HeightRangeSelect {...defaultProps} />);

            // Check that options include both display text and cm
            // Using getAllByRole since options appear in both min and max selects
            const firstOptions = screen.getAllByRole('option', { name: '4\'11" (150 cm)' });
            const lastOptions = screen.getAllByRole('option', { name: '6\'5" (195 cm)' });

            // Should have 2 instances (one in each select)
            expect(firstOptions).toHaveLength(2);
            expect(lastOptions).toHaveLength(2);
        });
    });

    describe('Internal State Management', () => {
        it('updates internal state when min height changes', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            await user.selectOptions(minSelect, '170');

            // Component should now display the new value
            expect(screen.getByDisplayValue('5\'7" (170 cm)')).toBeInTheDocument();
        });

        it('updates internal state when max height changes', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');
            await user.selectOptions(maxSelect, '185');

            // Component should now display the new value
            expect(screen.getByDisplayValue('6\'1" (185 cm)')).toBeInTheDocument();
        });

        it('maintains independent state after multiple changes', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            // Change min height
            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            await user.selectOptions(minSelect, '155');

            // Change max height  
            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');
            await user.selectOptions(maxSelect, '190');

            // Both values should be maintained
            expect(screen.getByDisplayValue('5\'1" (155 cm)')).toBeInTheDocument();
            expect(screen.getByDisplayValue('6\'3" (190 cm)')).toBeInTheDocument();
        });
    });

    describe('Min Height Changes', () => {
        it('calls onChange when min height is changed to valid value', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            await user.selectOptions(minSelect, '170');

            expect(onChange).toHaveBeenCalledWith({
                minHeight: 170,
                maxHeight: 180
            });
        });

        it('constrains min height to not exceed max height', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect initialMinHeight={160} initialMaxHeight={170} onChange={onChange} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            // Try to set min height to 185 (higher than max height of 170)
            await user.selectOptions(minSelect, '185');

            // Should constrain to max height
            expect(onChange).toHaveBeenCalledWith({
                minHeight: 170,
                maxHeight: 170
            });
        });

        it('updates internal state to constrained value', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect initialMinHeight={160} initialMaxHeight={170} onChange={onChange} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            await user.selectOptions(minSelect, '185');

            // Internal state should be updated to constrained value - both selects should show the same value
            const selectsWithConstrainedValue = screen.getAllByDisplayValue('5\'7" (170 cm)');
            expect(selectsWithConstrainedValue).toHaveLength(2); // Both min and max selects
        });

        it('allows min height equal to max height', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            await user.selectOptions(minSelect, '180');

            expect(onChange).toHaveBeenCalledWith({
                minHeight: 180,
                maxHeight: 180
            });
        });

        it('works without onChange callback', async () => {
            const user = userEvent.setup();

            render(<HeightRangeSelect initialMinHeight={160} initialMaxHeight={180} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            await expect(user.selectOptions(minSelect, '170')).resolves.not.toThrow();
        });
    });

    describe('Max Height Changes', () => {
        it('calls onChange when max height is changed to valid value', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');
            await user.selectOptions(maxSelect, '190');

            expect(onChange).toHaveBeenCalledWith({
                minHeight: 160,
                maxHeight: 190
            });
        });

        it('constrains max height to not go below min height', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect initialMinHeight={170} initialMaxHeight={180} onChange={onChange} />);

            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');
            // Try to set max height to 155 (lower than min height of 170)
            await user.selectOptions(maxSelect, '155');

            // Should constrain to min height
            expect(onChange).toHaveBeenCalledWith({
                minHeight: 170,
                maxHeight: 170
            });
        });

        it('updates internal state to constrained value', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect initialMinHeight={170} initialMaxHeight={180} onChange={onChange} />);

            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');
            await user.selectOptions(maxSelect, '155');

            // Internal state should be updated to constrained value - both selects should show the same value
            const selectsWithConstrainedValue = screen.getAllByDisplayValue('5\'7" (170 cm)');
            expect(selectsWithConstrainedValue).toHaveLength(2); // Both min and max selects
        });

        it('allows max height equal to min height', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');
            await user.selectOptions(maxSelect, '160');

            expect(onChange).toHaveBeenCalledWith({
                minHeight: 160,
                maxHeight: 160
            });
        });

        it('works without onChange callback', async () => {
            const user = userEvent.setup();

            render(<HeightRangeSelect initialMinHeight={160} initialMaxHeight={180} />);

            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');
            await expect(user.selectOptions(maxSelect, '190')).resolves.not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('handles boundary values correctly', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect initialMinHeight={150} initialMaxHeight={195} onChange={onChange} />);

            // Test minimum boundary
            const minSelect = screen.getByDisplayValue('4\'11" (150 cm)');
            await user.selectOptions(minSelect, '150');

            expect(onChange).toHaveBeenCalledWith({
                minHeight: 150,
                maxHeight: 195
            });

            // Test maximum boundary  
            const maxSelect = screen.getByDisplayValue('6\'5" (195 cm)');
            await user.selectOptions(maxSelect, '195');

            expect(onChange).toHaveBeenCalledWith({
                minHeight: 150,
                maxHeight: 195
            });
        });

        it('handles same min and max heights', () => {
            const onChange = jest.fn();

            render(<HeightRangeSelect initialMinHeight={170} initialMaxHeight={170} onChange={onChange} />);

            // When both selects have the same value, we should find exactly 2 elements
            const selectsWithSameValue = screen.getAllByDisplayValue('5\'7" (170 cm)');
            expect(selectsWithSameValue).toHaveLength(2);

            // Verify they are both select elements
            selectsWithSameValue.forEach(select => {
                expect(select.tagName).toBe('SELECT');
            });
        });

        it('sorts height options correctly', () => {
            render(<HeightRangeSelect {...defaultProps} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            const options = Array.from(minSelect.querySelectorAll('option'));
            const values = options.map(option => parseInt(option.value));

            // Should be sorted from lowest to highest
            const sortedValues = [...values].sort((a, b) => a - b);
            expect(values).toEqual(sortedValues);
        });
    });

    describe('User Interactions', () => {
        it('fires onChange multiple times for multiple changes', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            const maxSelect = screen.getByDisplayValue('5\'11" (180 cm)');

            await user.selectOptions(minSelect, '165');
            await user.selectOptions(maxSelect, '190');
            await user.selectOptions(minSelect, '170');

            expect(onChange).toHaveBeenCalledTimes(3);
            expect(onChange).toHaveBeenNthCalledWith(1, { minHeight: 165, maxHeight: 180 });
            expect(onChange).toHaveBeenNthCalledWith(2, { minHeight: 165, maxHeight: 190 });
            expect(onChange).toHaveBeenNthCalledWith(3, { minHeight: 170, maxHeight: 190 });
        });

        it('handles rapid successive changes with state updates', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect {...defaultProps} onChange={onChange} />);

            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');

            // Rapidly change values
            await user.selectOptions(minSelect, '165');
            await user.selectOptions(minSelect, '170');
            await user.selectOptions(minSelect, '175');

            expect(onChange).toHaveBeenCalledTimes(3);
            expect(onChange).toHaveBeenLastCalledWith({ minHeight: 175, maxHeight: 180 });

            // Final display should show the last selected value
            expect(screen.getByDisplayValue('5\'9" (175 cm)')).toBeInTheDocument();
        });

        it('maintains state consistency across constraint violations', async () => {
            const user = userEvent.setup();
            const onChange = jest.fn();

            render(<HeightRangeSelect initialMinHeight={160} initialMaxHeight={170} onChange={onChange} />);

            // First violate constraint with min
            const minSelect = screen.getByDisplayValue('5\'3" (160 cm)');
            await user.selectOptions(minSelect, '185');

            // After first constraint violation, both should show the constrained value
            const constrainedSelects = screen.getAllByDisplayValue('5\'7" (170 cm)');
            expect(constrainedSelects).toHaveLength(2);

            // Then violate constraint with max using CSS class to distinguish
            const maxSelect = document.querySelector('.to-select') as HTMLSelectElement;
            await user.selectOptions(maxSelect, '150');

            // Both should be constrained to the middle value
            expect(onChange).toHaveBeenLastCalledWith({ minHeight: 170, maxHeight: 170 });
            expect(screen.getAllByDisplayValue('5\'7" (170 cm)')).toHaveLength(2);
        });
    });
}); 