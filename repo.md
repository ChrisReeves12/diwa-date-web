# DIWA Date Web Application

A comprehensive dating web application built with Next.js 15, featuring real-time messaging, user matching, subscription management, and multi-datacenter support.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)

## Overview

DIWA Date is a modern dating platform that provides users with location-based matching, real-time messaging, photo management, and subscription-based premium features. The application is designed with scalability in mind, supporting multi-datacenter deployment with centralized WebSocket and messaging infrastructure.

**Version:** 0.1.0

## Tech Stack

### Frontend
- **Next.js 15.3.2** - React framework with App Router
- **React 19** - UI library
- **Material-UI (MUI) 6.4.8** - Component library
- **Emotion** - CSS-in-JS styling
- **Sass 1.86.0** - Additional styling with SCSS modules
- **Tailwind CSS 4** - Utility-first CSS framework
- **Socket.io Client** - Real-time WebSocket communication
- **React Icons & Line Awesome** - Icon libraries

### Backend & Infrastructure
- **Node.js** - Runtime environment
- **Next.js API Routes** - Backend API endpoints
- **PostgreSQL** - Primary database with PostGIS for geolocation
- **Prisma 6.5.0** - ORM with read/write replica support
- **Redis (ioredis)** - Session storage and caching
- **RabbitMQ (amqplib)** - Message queue for notifications
- **Socket.io** - WebSocket server for real-time features

### Cloud Services & APIs
- **AWS S3** - Photo storage with presigned URLs
- **Mailgun** - Email delivery service
- **OpenAI API** - AI-powered content moderation
- **Google Maps API** - Location services and geocoding
- **IP2Location** - Geolocation from IP addresses
- **PayPal API** - Payment processing
- **Sentry** - Error tracking and monitoring

### Development & Testing
- **TypeScript 5** - Type safety
- **Jest 30** - Unit testing
- **Playwright 1.53** - E2E testing
- **Testing Library** - React component testing
- **ESLint 9** - Code quality and linting
- **tsx & ts-node** - TypeScript execution
- **Commander.js** - CLI tool framework

### Additional Tools
- **Winston** - Structured logging
- **bcryptjs** - Password hashing
- **jsonwebtoken** - Authentication tokens
- **Sharp** - Image processing
- **ssim.js** - Image similarity detection
- **Moment.js** - Date/time manipulation
- **RxJS** - Reactive programming utilities

## Project Structure

```
diwa-date-web/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   ├── photos/          # Photo management endpoints
│   │   │   ├── test/            # Testing utilities
│   │   │   └── user/            # User data endpoints
│   │   ├── account/             # Account management pages
│   │   ├── auth/                # Authentication pages
│   │   ├── guest-home/          # Landing page for guests
│   │   ├── home-search/         # User search interface
│   │   ├── likes/               # Likes management
│   │   ├── login/               # Login page
│   │   ├── messages/            # Messaging interface
│   │   ├── onboarding/          # New user onboarding wizard
│   │   ├── profile/             # User profile management
│   │   ├── registration/        # User registration flow
│   │   ├── support/             # Support center
│   │   ├── upgrade/             # Premium subscription pages
│   │   └── user/                # User profile views
│   │
│   ├── common/                   # Shared components
│   │   ├── context/             # React Context providers
│   │   ├── server-actions/      # Server-side actions
│   │   ├── dashboard-wrapper/   # Layout wrapper
│   │   ├── notification-center/ # Notification system
│   │   ├── site-top-bar/        # Navigation bar
│   │   └── [other-components]/  # Reusable UI components
│   │
│   ├── console/                  # CLI tools
│   │   ├── commands/            # Console command implementations
│   │   ├── jobs/                # Background job scripts
│   │   └── cli.ts               # CLI entry point
│   │
│   ├── server-side-helpers/      # Server-side utilities
│   │   ├── __tests__/           # Server-side tests
│   │   ├── billing.helpers.ts
│   │   ├── cache.helpers.ts
│   │   ├── compliance.helper.ts
│   │   ├── cookie.helpers.ts
│   │   ├── logging.helpers.ts
│   │   ├── mail.helper.ts
│   │   ├── messages.helpers.ts
│   │   ├── notification.helper.ts
│   │   ├── notification-emitter.helper.ts
│   │   ├── paypal.helpers.ts
│   │   ├── s3.helper.ts
│   │   ├── session.helpers.ts
│   │   ├── session-db.helpers.ts
│   │   ├── time.helpers.ts
│   │   ├── two-factor.helpers.ts
│   │   └── user.helpers.ts
│   │
│   ├── lib/                      # Core library integrations
│   │   ├── image-processing.ts  # Sharp image utilities
│   │   ├── postgres.ts          # PostgreSQL connection
│   │   ├── prisma.ts            # Prisma client setup
│   │   ├── rabbitmq.ts          # RabbitMQ connection
│   │   └── s3.ts                # AWS S3 client
│   │
│   ├── hooks/                    # React custom hooks
│   │   ├── use-browser-notifications.ts
│   │   ├── use-fallback-image.ts
│   │   ├── use-websocket.ts
│   │   └── use-window-width.ts
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── auth-response.interface.ts
│   │   ├── notification-center-data.interface.ts
│   │   ├── search-parameters.interface.ts
│   │   ├── session.type.ts
│   │   ├── user-photo.type.ts
│   │   ├── user-preview.interface.ts
│   │   └── [other-types]/
│   │
│   ├── config/                   # Configuration files
│   │   └── countries.ts
│   │
│   ├── content/                  # Static content/copy
│   │   ├── guest-home-content.ts
│   │   ├── login-content.ts
│   │   └── registration-content.ts
│   │
│   ├── helpers/                  # Client-side helper functions
│   │   └── user.helpers.ts
│   │
│   ├── utils/                    # Utility functions
│   │   └── postal-code-utils.ts
│   │
│   ├── styles/                   # Global styles
│   │   └── globals.scss
│   │
│   ├── theme/                    # MUI theme configuration
│   │   └── theme.ts
│   │
│   ├── __test-utils__/          # Testing utilities
│   │   └── mocks/
│   │
│   ├── instrumentation.ts       # Server instrumentation
│   └── instrumentation-client.ts # Client instrumentation
│
├── prisma/
│   └── schema.prisma            # Database schema
│
├── docs/                        # Documentation
│   ├── console-command-creation.md
│   ├── database-operations.md
│   ├── multi-datacenter-deployment.md
│   └── help-center-dev.md
│
├── e2e/                         # End-to-end tests
│
├── public/                      # Static assets
│
├── .env                         # Environment variables (local)
├── env.example                  # Environment template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tsconfig.cli.json            # CLI TypeScript config
├── tsconfig.server.json         # Server TypeScript config
├── next.config.ts               # Next.js configuration
├── playwright.config.ts         # Playwright configuration
├── jest.config.js               # Jest configuration
└── CLAUDE.md                    # AI assistant instructions
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL 14+ with PostGIS extension
- Redis server
- RabbitMQ server
- AWS S3 bucket
- Required API keys (see Environment Variables)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd diwa-date-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```

   Edit `.env` and configure all required variables:
   - Database credentials
   - Redis connection
   - AWS S3 configuration
   - Email service (Mailgun)
   - API keys (OpenAI, Google Maps, IP2Location)
   - PayPal credentials
   - JWT secret

4. **Set up the database:**

   The project uses Prisma but does **not** use Prisma migrations. Update the database schema directly using SQL or MCP tools.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Alternative Development Modes

```bash
# Development with Turbopack (faster)
npm run dev:turbo

# Development with debugging enabled
npm run dev-debug
```

## Architecture

### Database Architecture

- **Primary Database:** PostgreSQL with PostGIS for geolocation queries
- **Read/Write Separation:** Uses `prismaWrite` and `prismaRead` for master/replica pattern
- **Session Storage:** Redis for fast session lookups
- **Caching:** Redis for application-level caching

### Real-Time Architecture

```
┌─────────────┐
│  NextJS App │
│   (Client)  │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────┐      ┌──────────┐
│ Socket.io   │◄────►│ RabbitMQ │
│   Server    │      │  Queue   │
└──────┬──────┘      └──────────┘
       │
       ▼
┌─────────────┐
│    Redis    │
│  (Sessions) │
└─────────────┘
```

- **WebSocket Server:** Standalone Socket.io server for real-time messaging
- **Message Queue:** RabbitMQ handles notification distribution
- **Session Management:** Redis stores user sessions across instances

### Multi-Datacenter Support

The application supports deployment across multiple datacenters with:
- Centralized WebSocket server
- Shared RabbitMQ for message queuing
- Shared Redis for session storage
- Regional NextJS instances for low latency

See [docs/multi-datacenter-deployment.md](docs/multi-datacenter-deployment.md) for details.

## Core Features

### User Management
- Email/password registration with verification
- Google OAuth integration
- Two-factor authentication
- Password reset functionality
- User profile management with photos
- Location-based user data with PostGIS

### Matching System
- Location-based user search with radius filtering
- Advanced search filters (age, height, preferences)
- Like/pass system
- Mutual match detection
- Block/mute functionality
- User reporting system

### Messaging
- Real-time chat with Socket.io
- Message read receipts
- Typing indicators
- Notification system for new messages
- Conversation management

### Photo Management
- AWS S3 photo upload with presigned URLs
- Image processing with Sharp
- Photo ordering/reordering
- Caption support
- Image similarity detection (SSIM)
- AI-powered content moderation

### Subscription System
- Multiple subscription tiers
- PayPal payment integration
- Billing information management
- Subscription lifecycle management
- Premium feature gating
- Auto-renewal handling

### Notifications
- In-app notification center
- Browser push notifications
- Email notifications via Mailgun
- Real-time notification delivery via WebSocket

### Security & Compliance
- bcrypt password hashing
- JWT session tokens
- CSRF protection
- Rate limiting
- IP-based geolocation
- Cookie consent management
- User reporting and moderation

## Development

### NPM Scripts

```bash
# Development
npm run dev              # Start Next.js dev server
npm run dev:turbo        # Start with Turbopack
npm run dev-debug        # Start with Node debugger

# Building
npm run build            # Build for production
npm start                # Start production server

# Testing
npm test                 # Run Jest unit tests
npm run test:watch       # Watch mode for tests
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # E2E tests with UI
npm run test:e2e:debug   # Debug E2E tests

# CLI Tools
npm run cli              # Run console commands
npm run cli:build        # Build CLI tools

# Background Jobs
npm run job:user-reviews # Poll user reviews table

# Code Quality
npm run lint             # Run ESLint
```

### Console Commands

The project includes a CLI tool system for administrative tasks:

```bash
# List all available commands
npm run cli

# Example: Suspend a user
npm run cli users:suspend --userId 123

# Example: Seed test users
npm run cli users:seed --count 100
```

See [docs/console-command-creation.md](docs/console-command-creation.md) for creating new commands.

### Styling Guidelines

- **SCSS Modules:** Use SCSS with the module pattern
- **Globals Import:** Always import globals in SCSS files:
  ```scss
  @use '@/styles/globals' as globals;
  ```
- **Responsive Design:** Mobile-first approach with breakpoint helpers
- **Dark Mode:** Use `@include globals.dark-mode` for dark mode styles
- **Material-UI:** Emotion-based styling for MUI components

### Database Guidelines

- **No Prisma Migrations:** Update schema directly in PostgreSQL
- **Raw Queries:** Always use double quotes around field names to preserve camelCase
- **Read/Write Separation:** Use `prismaRead` for reads, `prismaWrite` for writes
- **Transactions:** Use `$transaction()` for operations requiring consistency

See [docs/database-operations.md](docs/database-operations.md) for detailed database patterns.

## Testing

### Unit Testing (Jest)

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

Test files are located in:
- `src/**/__tests__/` - Component and helper tests
- Jest configuration: `jest.config.js`

### E2E Testing (Playwright)

```bash
npm run test:e2e         # Run E2E tests (single worker)
npm run test:e2e:parallel # Run with parallel workers
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:headed  # Run with browser visible
npm run test:e2e:debug   # Debug mode
npm run test:e2e:report  # View test report
```

E2E tests located in: `e2e/`

Configuration: `playwright.config.ts`

### Test Utilities

- **Test User Creation:** `src/app/api/test/create-user/route.ts`
- **Test Cleanup:** `src/app/api/test/cleanup/route.ts`
- **Database Utilities:** `e2e/utils/test-db.ts`
- **Mocks:** `src/__test-utils__/mocks/`

## Deployment

### Environment Configuration

Required environment variables (see `env.example` for complete list):

**Core:**
- `PORT` - Application port (default: 3000)
- `NEXT_PUBLIC_BASE_URL` - Application base URL
- `NEXT_PUBLIC_WEBSOCKET_URL` - WebSocket server URL

**Database:**
- `DATABASE_URL` - PostgreSQL connection string

**Redis:**
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

**AWS:**
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

**Email:**
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`

**APIs:**
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `IP2LOCATION_KEY`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`

**Authentication:**
- `JWT_SECRET`
- `SESSION_COOKIE_NAME`

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Multi-Datacenter Deployment

For deploying across multiple datacenters:

1. Deploy centralized Redis, RabbitMQ, and WebSocket servers
2. Deploy NextJS instances in each datacenter
3. Configure load balancer for WebSocket sticky sessions
4. Set up monitoring and health checks

See [docs/multi-datacenter-deployment.md](docs/multi-datacenter-deployment.md) for complete guide.

### Monitoring

- **Error Tracking:** Sentry integration for server and edge runtime
- **Logging:** Winston structured logging
- **Health Checks:** WebSocket server health endpoint
- **Metrics:** Monitor WebSocket connections, message queues, database performance

## Documentation

Additional documentation available in the `docs/` directory:

- **[Console Command Creation](docs/console-command-creation.md)** - Guide for creating CLI tools
- **[Database Operations](docs/database-operations.md)** - Database patterns and operations reference
- **[Multi-Datacenter Deployment](docs/multi-datacenter-deployment.md)** - Deployment architecture guide
- **[Help Center Development](docs/help-center-dev.md)** - Help center implementation guide

### Key Code References

- **User Authentication:** `src/app/login/login.actions.ts:1`, `src/app/registration/registration-form-actions.ts:1`
- **Messaging System:** `src/server-side-helpers/messages.helpers.ts:1`
- **Notifications:** `src/server-side-helpers/notification-emitter.helper.ts:1`
- **Photo Upload:** `src/app/api/photos/upload/route.ts:1`
- **Subscription Management:** `src/app/account/billing/billing.actions.ts:1`
- **WebSocket Integration:** `src/hooks/use-websocket.ts:1`

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and profiles
- `userMatches` - Mutual matches between users
- `messages` - Chat messages
- `notifications` - User notifications
- `blockedUsers` - User block relationships
- `mutedUsers` - User mute relationships
- `userReports` - User reports for moderation
- `subscriptionPlanEnrollments` - Premium subscriptions
- `billingInformationEntries` - Billing data
- `paymentTransactions` - Payment history
- `cachedLocations` - Location cache with PostGIS data

Schema file: `prisma/schema.prisma`

## Contributing

When contributing to this project:

1. Follow the existing code patterns
2. Use TypeScript for type safety
3. Write tests for new features
4. Update documentation as needed
5. Follow the styling guidelines in CLAUDE.md
6. Use the console command system for CLI tools

## License

Private/Proprietary

## Support

For questions or issues, refer to:
- Internal documentation in `docs/`
- CLAUDE.md for AI assistant guidelines
- Project issue tracker

---

**Last Updated:** November 13, 2025
**Repository Status:** Active Development
