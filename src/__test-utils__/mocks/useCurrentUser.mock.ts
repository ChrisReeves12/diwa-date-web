import { User } from '@/types/user.interface';

// Mock the useCurrentUser hook
export const mockUseCurrentUser = jest.fn();

// Create a fake user object for testing with all required properties
export const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 123,
    displayName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    gender: 'male',
    dateOfBirth: new Date('1990-01-01'),
    email: 'john@test.com',
    numOfPhotos: 3,
    seekingMinHeight: 150,
    seekingMaxHeight: 190,
    seekingMinAge: 25,
    seekingMaxAge: 45,
    seekingNumOfPhotos: 3,
    seekingMaxDistance: 100,
    password: 'hashed_password',
    isSubscriptionActive: false,
    age: 34,
    subscriptionPlanEnrollments: [],
    mainPhotoCroppedImageData: undefined,
    publicMainPhoto: '/images/test-photo.jpg',
    ...overrides
} as User);

// Setup function to initialize the mock
export const setupUseCurrentUserMock = () => {
    jest.mock('@/common/context/current-user-context', () => ({
        useCurrentUser: mockUseCurrentUser
    }));
}; 