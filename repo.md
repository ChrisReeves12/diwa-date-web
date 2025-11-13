# DIWA Date Web - Repository Overview

## Project Summary

**DIWA Date Web** is a Next.js-based dating application with a comprehensive feature set including user profiles, messaging, image uploads, and community interactions. The project is built with modern web technologies and follows a monolithic architecture with clear separation between frontend components, backend API routes, and shared utilities.

- **Repository**: https://github.com/ChrisReeves12/diwa-date-web
- **Tech Stack**: Next.js 15, React 19, TypeScript, Prisma, PostgreSQL
- **Package Manager**: npm
- **Node Version**: Requires Node 18+

## Project Structure

```
diwa-date-web/
├── src/
│   ├── app/                          # Next.js app directory (pages and layouts)
│   │   ├── api/                      # API routes
│   │   ├── account/                  # Account management pages
│   │   ├── login/                    # Authentication
│   │   ├── registration/             # User registration
│   │   ├── profile/                  # User profile pages
│   │   ├── home-search/              # Search and discovery
│   │   ├── messages/                 # Messaging system
│   │   ├── likes/                    # Likes/matches functionality
│   │   ├── onboarding/               # User onboarding flow
│   │   ├── upgrade/                  # Premium features
│   │   ├── guest-home/               # Public landing page
│   │   ├── support/                  # Help/support pages
│   │   ├── privacy-policy/           # Legal pages
│   │   ├── terms-of-service/         # Legal pages
│   │   └── community-guidelines/     # Legal pages
│   ├── common/                       # Shared components
│   │   ├── site-top-bar/            # Navigation bar component
│   │   └── context/                 # React context providers
│   ├── server-side-helpers/         # Server-side utilities (Prisma, auth, etc.)
│   ├── lib/                         # Utility libraries
│   ├── utils/                       # Helper functions
│   ├── hooks/                       # Custom React hooks
│   ├── types/                       # TypeScript type definitions
│   ├── styles/                      # Global and SCSS stylesheets
│   ├── content/                     # Static content
│   ├── config/                      # Configuration files
│   ├── console/                     # CLI commands for administrative tasks
│   │   ├── cli.ts                   # CLI entry point
│   │   ├── commands/                # Console command implementations
│   │   └── jobs/                    # Scheduled job implementations
│   └── __test-utils__/              # Testing utilities and mocks
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── migrations/                  # Database migrations
├── docs/                            # Project documentation
├── playwright.config.ts             # E2E testing configuration
├── next.config.ts                   # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
├── jest.config.js                   # Jest testing configuration
└── package.json                     # Dependencies and scripts
```

## Key Features

### Core Functionality
- **User Authentication**: Login, registration, JWT-based sessions
- **User Profiles**: Profile creation, editing, image uploads
- **Search & Discovery**: User search with filtering
- **Messaging**: Real-time chat between users (Socket.io)
- **Likes/Matching**: Like system and match discovery
- **Image Management**: Upload, process, and serve user images (AWS S3 integration)
- **Premium Tier**: Upgrade system for additional features
- **Onboarding**: Multi-step user onboarding flow

### Technical Features
- **Real-time Updates**: Socket.io for live messaging and notifications
- **Image Processing**: Sharp for image optimization
- **Cloud Storage**: AWS S3 integration for image storage
- **Error Tracking**: Sentry integration for monitoring
- **Email**: Mailgun integration for transactional emails
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for session and cache management
- **Task Queue**: RabbitMQ/AMQP for background jobs
- **Logging**: Winston for structured logging

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis instance
- AWS S3 credentials
- Mailgun account (optional)
- Google Maps API key (optional)
- OpenAI API key (optional)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/ChrisReeves12/diwa-date-web.git
   cd diwa-date-web
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```

   Configure the following in `.env`:
   - Database credentials (PostgreSQL)
   - AWS S3 configuration
   - Email service settings (Mailgun)
   - API keys (OpenAI, Google Maps, IP2Location)
   - Redis connection details
   - JWT secrets
   - Session configuration

4. Set up the database
   ```bash
   npm run prisma migrate deploy
   # or update schema directly using MCP tools
   ```

### Running the Development Server

```bash
# Standard development server
npm run dev

# With Turbopack (faster builds)
npm run dev:turbo

# Debug mode (inspect on 0.0.0.0:9230)
npm run dev-debug
```

The application will be available at `http://localhost:3000`

## Available Scripts

### Development & Building
- `npm run dev` - Start development server
- `npm run dev:turbo` - Start with Turbopack
- `npm run dev-debug` - Start with Node debugger
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing
- `npm test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:e2e` - Run Playwright E2E tests (serial)
- `npm run test:e2e:parallel` - Run Playwright E2E tests (parallel)
- `npm run test:e2e:ui` - Run E2E tests with UI
- `npm run test:e2e:headed` - Run E2E tests in headed mode
- `npm run test:e2e:debug` - Debug E2E tests
- `npm run test:e2e:report` - View E2E test report

### Console Commands
- `npm run cli` - List all available CLI commands
- `npm run cli [command]` - Execute specific command
- `npm run cli:build` - Build CLI commands

### Background Jobs
- `npm run job:user-reviews` - Poll user reviews table

## Important Development Guidelines

### Database Updates
- **No Prisma migrations** are used in this project
- When updating the database schema:
  1. Update `prisma/schema.prisma`
  2. Also update the database directly using MCP tools
  3. Run `npx prisma generate` to update client types

### Query Guidelines
- Surround all field names with double quotes in raw queries to preserve camelCase
- Always use `prismaRead` for read operations (uses read replica)
- Always use `prismaWrite` for write operations (uses master database)

### Styling Guidelines
- Always include `@use '@/styles/globals' as globals;` at the top of SCSS files
- Use `globals` breakpoint helpers for responsive design (mobile-first approach)
- Use `@include globals.dark-mode` for dark mode styling
- Default styling assumes mobile devices, add desktop styles with media queries

### Path Aliases
The project uses TypeScript path aliases for cleaner imports:
- `@/*` → `./src/*`

Example: `import Component from '@/common/site-top-bar'`

## Technology Stack

### Frontend
- **Framework**: Next.js 15.3.2
- **UI Library**: React 19
- **Styling**: SASS/SCSS with Tailwind CSS 4
- **Component Libraries**: Material-UI (MUI), React Icons
- **State Management**: React Context
- **Date Picker**: MUI X Date Pickers

### Backend
- **Runtime**: Node.js
- **ORM**: Prisma 6.5.0
- **Database**: PostgreSQL
- **API Communication**: Axios
- **Real-time**: Socket.io 4.8.1
- **Task Queue**: RabbitMQ (amqplib)
- **Caching**: Redis (ioredis)
- **Email**: Mailgun

### Cloud & Services
- **Cloud Storage**: AWS S3 (image uploads)
- **Image Processing**: Sharp
- **Error Tracking**: Sentry
- **Logging**: Winston
- **Auth**: JWT (jsonwebtoken), bcryptjs

### Development & Testing
- **Language**: TypeScript 5
- **Testing**: Jest 30, Playwright 1.53
- **Linting**: ESLint 9
- **CLI**: Commander.js
- **Build Tools**: TSC, tsc-alias
- **Code Generation**: Prisma client generation

## Console Commands

The project includes a CLI for administrative tasks. Commands are organized by category:

```bash
npm run cli [command:action] [options]
```

### Creating New Commands

1. Create command file in `src/console/commands/` following pattern: `[action]-[entity].command.ts`
2. Extend `ConsoleCommand` base class
3. Register in `src/console/cli.ts`

Example:
```typescript
export default class YourCommand extends ConsoleCommand {
    constructor() {
        super('entity:action', 'Description', [
            { option: '-r, --required <value>', description: 'Required option', required: true }
        ]);
    }

    async handle(prog: Command): Promise<number> {
        // Implementation
        return 0; // Success
    }
}
```

See `docs/console-command-creation.md` for detailed guide.

## Database Schema

The application uses Prisma with PostgreSQL. Key entities include:
- **Users**: Core user profile data
- **Profiles**: Extended user profile information
- **Images**: User-uploaded images
- **Messages**: Chat messages between users
- **Matches/Likes**: User interaction data
- **Subscriptions**: Premium tier data

The schema is defined in `prisma/schema.prisma` (460 lines).

## Project Statistics

- **TypeScript Files**: 222 files (`.ts` and `.tsx`)
- **Database Schema**: 460 lines (Prisma)
- **Documentation**: guides for console commands, database operations, deployment, help center

## API Structure

API routes follow Next.js app router conventions:
- `src/app/api/[route]/route.ts` - API endpoints
- Standard REST conventions for CRUD operations
- Integration with Prisma for data access
- Error handling with Sentry monitoring

## Notable Dependencies

- `@prisma/client` - Database ORM
- `@sentry/nextjs` - Error tracking
- `socket.io` / `socket.io-client` - Real-time communication
- `axios` - HTTP client
- `ioredis` - Redis client
- `amqplib` - RabbitMQ client
- `mailgun.js` - Email service
- `sharp` - Image processing
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT handling
- `winston` - Logging

## Git Repository

- **Remote**: git@github.com:ChrisReeves12/diwa-date-web.git
- **Current Branch**: master
- **Recent Commits**:
  - `2ca585a` - Fixed sorting logic error
  - `8f3d128` - Added custom retargeting ad
  - `84ae49b` - Added conversion API for Meta
  - `360e371` - Updates
  - `7023e98` - Added FB pixel again

## Documentation

Key documentation files in `docs/`:
- `console-command-creation.md` - Guide for creating CLI commands
- `database-operations.md` - Database operations guide
- `multi-datacenter-deployment.md` - Deployment documentation
- `help-center-dev.md` - Help center development

## Code Quality

- **Linting**: ESLint with Next.js config
- **Type Safety**: Strict TypeScript mode enabled
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **Source Maps**: Enabled for debugging
- **Error Tracking**: Sentry for production monitoring

## Environment Configuration

The project uses environment variables for configuration. Key variables:
- Database credentials and connection strings
- AWS S3 configuration
- Email service (Mailgun) API keys
- External API keys (OpenAI, Google Maps, IP2Location)
- Redis connection details
- JWT and session secrets
- Feature flags
- Development settings

See `.env` file or create from `.env.example` template.

## Deployment

The application is configured for deployment with:
- Next.js build optimization
- Sentry error tracking integration
- Support for multi-datacenter deployment (documented in `docs/`)
- Environment-based configuration
- Production and development modes

## Performance Considerations

- Uses Turbopack for faster development builds
- Image optimization with Sharp
- Code splitting and bundling optimization
- Redis caching for frequently accessed data
- Read replica database for scaling read operations

---

**Last Updated**: November 12, 2025
**Repository Status**: Active Development
