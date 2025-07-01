"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
require("@testing-library/jest-dom");
const notification_center_1 = __importDefault(require("../notification-center"));
const current_user_context_1 = require("../../context/current-user-context");
const useCurrentUser_mock_1 = require("@/__test-utils__/mocks/useCurrentUser.mock");
const notifications_actions_1 = require("@/common/server-actions/notifications.actions");
// Create mocks
jest.mock('../../context/current-user-context', () => ({
    useCurrentUser: jest.fn()
}));
jest.mock('../user-profile-account-menu/user-profile-account-menu', () => {
    return function MockUserProfileAccountMenu({ onSelectionMade }) {
        return (<div data-testid="user-profile-account-menu">
                <div>Account Menu</div>
                <button onClick={onSelectionMade}>Mock Account Action</button>
            </div>);
    };
});
jest.mock('@/common/server-actions/notifications.actions', () => ({
    loadNotificationCenterData: jest.fn()
}));
// Cast to jest.MockedFunction for TypeScript
const mockUseCurrentUser = current_user_context_1.useCurrentUser;
const mockLoadNotificationCenterData = notifications_actions_1.loadNotificationCenterData;
describe('NotificationCenter', () => {
    const mockUser = (0, useCurrentUser_mock_1.createMockUser)();
    const mockNotificationData = {
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
            const { container } = (0, react_1.render)(<notification_center_1.default />);
            // Should render nothing when no user
            expect(container.firstChild).toBeNull();
        });
        it('shows loading state when user is logged in', () => {
            // Mock useCurrentUser to return our fake user
            mockUseCurrentUser.mockReturnValue(mockUser);
            (0, react_1.render)(<notification_center_1.default />);
            // Should show loading state initially - icons should be disabled
            expect(react_1.screen.getByRole('button', { name: /matches/i })).toBeDisabled();
            expect(react_1.screen.getByRole('button', { name: /messages/i })).toBeDisabled();
            expect(react_1.screen.getByRole('button', { name: /notifications/i })).toBeDisabled();
            // Profile section should show user info but be disabled  
            expect(react_1.screen.getByText('My Account')).toBeInTheDocument();
            expect(react_1.screen.getByText('John Doe')).toBeInTheDocument();
            // The loading state should have the loading CSS class
            expect(document.querySelector('.notification-center-loading')).toBeInTheDocument();
        });
        it('renders user profile information correctly', () => {
            mockUseCurrentUser.mockReturnValue(mockUser);
            (0, react_1.render)(<notification_center_1.default />);
            // Check that user's display name appears
            expect(react_1.screen.getByText('John Doe')).toBeInTheDocument();
            expect(react_1.screen.getByText('My Account')).toBeInTheDocument();
            // Check that profile container exists
            const profileContainer = react_1.screen.getByText('John Doe').closest('.profile-container');
            expect(profileContainer).toBeInTheDocument();
        });
        it('handles different user display names', () => {
            const differentUser = (0, useCurrentUser_mock_1.createMockUser)({
                displayName: 'Jane Smith'
            });
            mockUseCurrentUser.mockReturnValue(differentUser);
            (0, react_1.render)(<notification_center_1.default />);
            expect(react_1.screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(react_1.screen.queryByText('John Doe')).not.toBeInTheDocument();
        });
    });
    describe('Popover Interaction Tests', () => {
        it('shows and hides the likes popover on click interactions', async () => {
            const user = user_event_1.default.setup();
            mockUseCurrentUser.mockReturnValue(mockUser);
            (0, react_1.render)(<notification_center_1.default />);
            // Wait for loading to complete and buttons to become enabled
            await (0, react_1.waitFor)(() => {
                expect(react_1.screen.getByRole('button', { name: /matches/i })).not.toBeDisabled();
            });
            // Initially, popover should not be visible
            expect(document.querySelector('.notification-menu-container')).not.toBeInTheDocument();
            // Click the matches button to open popover
            const matchesButton = react_1.screen.getByRole('button', { name: /matches/i });
            await user.click(matchesButton);
            // Popover should now be visible
            await (0, react_1.waitFor)(() => {
                expect(document.querySelector('.notification-menu-container')).toBeInTheDocument();
            });
            // Click on the backdrop to close the popover
            const backdrop = document.querySelector('.MuiBackdrop-root');
            expect(backdrop).toBeInTheDocument();
            await user.click(backdrop);
            // Popover should be hidden again
            await (0, react_1.waitFor)(() => {
                expect(document.querySelector('.notification-menu-container')).not.toBeInTheDocument();
            });
        });
        it('shows and hides the messages popover on click interactions', async () => {
            const user = user_event_1.default.setup();
            mockUseCurrentUser.mockReturnValue(mockUser);
            (0, react_1.render)(<notification_center_1.default />);
            // Wait for loading to complete and buttons to become enabled
            await (0, react_1.waitFor)(() => {
                expect(react_1.screen.getByRole('button', { name: /messages/i })).not.toBeDisabled();
            });
            // Initially, popover should not be visible
            expect(document.querySelector('.notification-menu-container')).not.toBeInTheDocument();
            // Click the messages button to open popover
            const messagesButton = react_1.screen.getByRole('button', { name: /messages/i });
            await user.click(messagesButton);
            // Popover should now be visible
            await (0, react_1.waitFor)(() => {
                expect(document.querySelector('.notification-menu-container')).toBeInTheDocument();
            });
            // Click on the backdrop to close the popover
            const backdrop = document.querySelector('.MuiBackdrop-root');
            expect(backdrop).toBeInTheDocument();
            await user.click(backdrop);
            // Popover should be hidden again
            await (0, react_1.waitFor)(() => {
                expect(document.querySelector('.notification-menu-container')).not.toBeInTheDocument();
            });
        });
        it('shows and hides the notifications popover on click interactions', async () => {
            const user = user_event_1.default.setup();
            mockUseCurrentUser.mockReturnValue(mockUser);
            (0, react_1.render)(<notification_center_1.default />);
            // Wait for loading to complete and buttons to become enabled
            await (0, react_1.waitFor)(() => {
                expect(react_1.screen.getByRole('button', { name: /notifications/i })).not.toBeDisabled();
            });
            // Initially, popover should not be visible
            expect(document.querySelector('.notification-menu-container')).not.toBeInTheDocument();
            // Click the notifications button to open popover
            const notificationsButton = react_1.screen.getByRole('button', { name: /notifications/i });
            await user.click(notificationsButton);
            // Popover should now be visible
            await (0, react_1.waitFor)(() => {
                expect(document.querySelector('.notification-menu-container')).toBeInTheDocument();
            });
            // Click on the backdrop to close the popover
            const backdrop = document.querySelector('.MuiBackdrop-root');
            expect(backdrop).toBeInTheDocument();
            await user.click(backdrop);
            // Popover should be hidden again
            await (0, react_1.waitFor)(() => {
                expect(document.querySelector('.notification-menu-container')).not.toBeInTheDocument();
            });
        });
    });
});
//# sourceMappingURL=notification-center.test.jsx.map