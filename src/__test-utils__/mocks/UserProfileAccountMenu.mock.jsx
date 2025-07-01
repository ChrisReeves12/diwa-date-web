"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the logout actions first
jest.mock('@/common/server-actions/logout.actions', () => ({
    logout: jest.fn().mockResolvedValue(undefined) // No-op async function
}));
// Mock the useCurrentUser hook
jest.mock('@/common/context/current-user-context', () => ({
    useCurrentUser: jest.fn()
}));
// Simple mock component for UserProfileAccountMenu
const MockUserProfileAccountMenu = ({ onSelectionMade }) => {
    return (<div data-testid="user-profile-account-menu">
            <div>Account Menu</div>
            <button onClick={onSelectionMade}>Mock Account Action</button>
        </div>);
};
exports.default = MockUserProfileAccountMenu;
//# sourceMappingURL=UserProfileAccountMenu.mock.jsx.map