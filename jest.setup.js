import '@testing-library/jest-dom'

// Mock environment variables
process.env.APP_KEY = 'test-app-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/diwa_date'
process.env.MEDIA_IMAGE_ROOT_URL = 'https://example.com/media'
process.env.FAKER_MEDIA_IMAGE_ROOT_URL = 'https://example.com/faker'

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props) => {

        return <img {...props} />
    },
})) 