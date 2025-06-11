import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationCenter from '../notification-center';
import { useCurrentUser } from '../../context/current-user-context';
import { createMockUser } from '@/__test-utils__/mocks/useCurrentUser.mock';
import { loadNotificationCenterData } from '@/common/server-actions/notifications.actions';
import { NotificationCenterData } from '@/types/notification-center-data.interface';

// Create mocks
jest.mock('../../context/current-user-context', () => ({
    useCurrentUser: jest.fn()
}));

jest.mock('../user-profile-account-menu/user-profile-account-menu', () => {
    return function MockUserProfileAccountMenu({ onSelectionMade }: { onSelectionMade?: () => void }) {
        return (
            <div data-testid="user-profile-account-menu">
                <div>Account Menu</div>
                <button onClick={onSelectionMade}>Mock Account Action</button>
            </div>
        );
    };
});

jest.mock('@/common/server-actions/notifications.actions', () => ({
    loadNotificationCenterData: jest.fn()
}));

// Cast to jest.MockedFunction for TypeScript
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockLoadNotificationCenterData = loadNotificationCenterData as jest.MockedFunction<typeof loadNotificationCenterData>;

describe('NotificationCenter', () => {
    const mockUser = createMockUser();

    const mockNotificationData: NotificationCenterData = {
        pendingMatches: [],
        receivedMessages: [],
        pendingMatchesCount: 3,
        receivedMessagesCount: 5,
        receivedNotifications: [],
        notificationCount: 2
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockLoadNotificationCenterData.mockResolvedValue(mockNotificationData);
    });

    describe('User Context Tests', () => {
        it('renders nothing when no current user', () => {
            // Mock useCurrentUser to return undefined (no logged in user)
            mockUseCurrentUser.mockReturnValue(undefined);

            const { container } = render(<NotificationCenter />);

            // Should render nothing when no user
            expect(container.firstChild).toBeNull();
        });

        it('shows loading state when user is logged in', () => {
            // Mock useCurrentUser to return our fake user
            mockUseCurrentUser.mockReturnValue(mockUser);

            render(<NotificationCenter />);

            // Should show loading state initially - icons should be disabled
            expect(screen.getByRole('button', { name: /matches/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /messages/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /notifications/i })).toBeDisabled();

            // Profile section should show user info but be disabled  
            expect(screen.getByText('My Account')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();

            // The loading state should have the loading CSS class
            expect(document.querySelector('.notification-center-loading')).toBeInTheDocument();
        });

        it('renders user profile information correctly', () => {
            mockUseCurrentUser.mockReturnValue(mockUser);

            render(<NotificationCenter />);

            // Check that user's display name appears
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('My Account')).toBeInTheDocument();

            // Check that profile container exists
            const profileContainer = screen.getByText('John Doe').closest('.profile-container');
            expect(profileContainer).toBeInTheDocument();
        });

        it('handles different user display names', () => {
            const differentUser = createMockUser({
                displayName: 'Jane Smith'
            });

            mockUseCurrentUser.mockReturnValue(differentUser);

            render(<NotificationCenter />);

            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        });
    });
});