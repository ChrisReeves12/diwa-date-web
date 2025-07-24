# Database Operations Reference

This document provides a comprehensive overview of all database operations (INSERT, UPDATE, DELETE) in the codebase.

## INSERT Operations

### Prisma ORM Create Operations

#### User Management
- **File:** `src/server-side-helpers/user.helpers.ts`
  - **Line 124:** `prisma.blockedUsers.create()` - Creates blocked user relationships
  - **Line 751:** `prisma.notifications.create()` - Creates match confirmation notifications
  - **Line 792:** `prisma.userMatches.create()` - Creates new pending match requests
  - **Line 963:** `prisma.mutedUsers.create()` - Creates muted user relationships

#### Billing Operations
- **File:** `src/app/account/billing/billing.actions.ts`
  - **Line 127:** `prisma.billingInformationEntries.create()` - Creates new billing information
  - **Line 330:** `prisma.billingInformationEntries.create()` - Creates billing info during subscription

- **File:** `src/server-side-helpers/billing.helpers.ts`
  - **Line 477:** `prisma.paymentTransactions.create()` - Creates payment transaction records

#### Test Operations
- **File:** `src/server-side-helpers/__tests__/messages.helpers.test.ts`
  - **Lines 18, 43:** `prisma.users.create()` - Creates test users for message testing
  - **Line 69:** `prisma.userMatches.create()` - Creates test match records
  - **Line 318:** `prisma.blockedUsers.create()` - Creates blocked user records for tests

- **File:** `src/app/api/test/create-user/route.ts`
  - **Line 87:** `prisma.users.create()` - Creates test users via API

### Raw SQL INSERT Operations

#### Subscription Management
- **File:** `src/console/commands/eval-user-subscription.command.ts`
  - **Lines 110, 669:** `INSERT INTO "billingHolds"` - Inserts billing hold records when payments fail

#### User Creation
- **File:** `src/console/commands/seed-users.command.ts`
  - **Line 246:** `INSERT INTO "users"` - Bulk user creation for seeding database

- **File:** `src/app/registration/registration-form-actions.ts`
  - **Line 81:** `INSERT INTO users` - Creates new user during registration with geolocation data

- **File:** `e2e/utils/test-db.ts`
  - **Line 32:** `INSERT INTO users` - Creates test users for e2e testing

#### Billing Operations
- **File:** `src/app/account/billing/billing.actions.ts`
  - **Line 637:** `INSERT INTO "subscriptionPlanEnrollments"` - Creates subscription enrollments
  - **Line 669:** `INSERT INTO "billingHolds"` - Creates billing holds for payment issues

#### User Reports
- **File:** `src/server-side-helpers/user.helpers.ts`
  - **Line 1548:** `INSERT INTO "userReports"` - Creates user report records

## UPDATE Operations

### Prisma ORM Update Operations

#### User Management
- **File:** `src/server-side-helpers/user.helpers.ts`
  - **Line 181:** `prisma.users.update()` - Updates user's last active timestamp
  - **Line 664:** `prisma.users.update()` - Updates user profile information
  - **Line 738:** `prisma.userMatches.update()` - Confirms pending matches
  - **Line 1490:** `prisma.users.update()` - Updates user profile (non-geo version)

#### Onboarding
- **File:** `src/app/onboarding/wizard-actions.ts`
  - **Line 19:** `prisma.users.update()` - Updates user onboarding progress
  - **Line 93:** `prisma.users.update()` - Completes user onboarding process

#### Photo Management
- **File:** `src/app/api/photos/upload/route.ts`
  - **Line 99:** `prisma.users.update()` - Updates user photos after upload

- **File:** `src/app/api/photos/reorder/route.ts`
  - **Line 60:** `prisma.users.update()` - Updates photo order

- **File:** `src/app/api/photos/replace/route.ts`
  - **Line 123:** `prisma.users.update()` - Updates photos after replacement

- **File:** `src/app/api/photos/confirm-upload/route.ts`
  - **Line 58:** `prisma.users.update()` - Confirms photo upload

- **File:** `src/app/api/photos/update-caption/route.ts`
  - **Line 43:** `prisma.users.update()` - Updates photo captions

- **File:** `src/app/api/photos/delete/route.ts`
  - **Line 56:** `prisma.users.update()` - Updates photos after deletion

#### Billing Operations
- **File:** `src/app/account/billing/billing.actions.ts`
  - **Line 121:** `prisma.billingInformationEntries.update()` - Updates existing billing information

- **File:** `src/server-side-helpers/billing.helpers.ts`
  - **Line 654:** `prisma.billingInformationEntries.update()` - Updates billing information

#### User Settings
- **File:** `src/common/server-actions/user.actions.ts`
  - **Line 21:** `prisma.users.update()` - Updates user online status visibility
  - **Line 71:** `prisma.users.update()` - Updates user password
  - **Line 167:** `prisma.users.update()` - Updates user active timestamp

#### Messages & Notifications
- **File:** `src/server-side-helpers/messages.helpers.ts`
  - **Line 470:** `prisma.messages.updateMany()` - Marks messages as read
  - **Line 532:** `prisma.userMatches.updateMany()` - Updates match read status

- **File:** `src/server-side-helpers/notification.helper.ts`
  - **Line 299:** `prisma.notifications.updateMany()` - Marks notifications as read

#### Search Preferences
- **File:** `src/app/home-search/home-search.actions.ts`
  - **Line 37:** `prisma.users.update()` - Updates user search preferences

### Raw SQL UPDATE Operations

#### Subscription Management
- **File:** `src/console/commands/eval-user-subscription.command.ts`
  - **Line 54:** `UPDATE "users" SET "isPremium" = false` - Removes premium status from expired users
  - **Line 83:** `UPDATE "subscriptionPlanEnrollments"` - Updates subscription payment information
  - **Line 115:** `UPDATE "subscriptionPlanEnrollments"` - Updates evaluation timestamps
  - **Line 134:** `UPDATE "users" SET "isPremium" = false` - Removes premium status after failed payments

#### User Authentication
- **File:** `src/server-side-helpers/user.helpers.ts`
  - **Line 507:** `UPDATE "users" SET "resetToken"` - Sets password reset tokens
  - **Line 521:** `UPDATE "users"` - Updates user email and clears reset tokens
  - **Line 1455:** `prisma.$executeRaw` - Updates user profile with geolocation data

#### Onboarding
- **File:** `src/app/onboarding/wizard-actions.ts`
  - **Line 67:** `UPDATE users SET "currentOnboardingSteps"` - Updates onboarding progress
  - **Line 117:** `UPDATE users SET "currentOnboardingSteps" = NULL` - Clears onboarding steps

#### Billing Operations
- **File:** `src/app/account/billing/billing.actions.ts`
  - **Line 608:** `UPDATE "subscriptionPlanEnrollments"` - Updates existing subscription
  - **Line 659:** `UPDATE "users" SET "isPremium" = true` - Grants premium status
  - **Line 754:** `UPDATE "subscriptionPlanEnrollments"` - Sets subscription end date
  - **Line 805:** `UPDATE "subscriptionPlanEnrollments"` - Removes subscription end date

## DELETE Operations

### Prisma ORM Delete Operations

#### User Relationships
- **File:** `src/server-side-helpers/user.helpers.ts`
  - **Line 153:** `prisma.blockedUsers.deleteMany()` - Unblocks users
  - **Line 823:** `prisma.mutedUsers.deleteMany()` - Unmutes users when match is confirmed
  - **Line 914:** `prisma.userMatches.deleteMany()` - Removes match requests
  - **Line 1116:** `prisma.mutedUsers.deleteMany()` - Unmutes users explicitly

#### Billing Operations
- **File:** `src/app/account/billing/billing.actions.ts`
  - **Line 241:** `prisma.billingInformationEntries.delete()` - Deletes billing information
  - **Line 388:** `prisma.billingInformationEntries.delete()` - Removes billing information during cancellation

#### User Management
- **File:** `src/common/server-actions/user.actions.ts`
  - **Line 140:** `prisma.users.delete()` - Deletes user account permanently

#### Test Operations
- **File:** `src/server-side-helpers/__tests__/messages.helpers.test.ts`
  - **Lines 83, 111:** `prisma.messages.deleteMany()` - Cleans up test messages
  - **Lines 88, 94, 100:** `prisma.users.delete()` - Deletes test users
  - **Line 337:** `prisma.blockedUsers.deleteMany()` - Cleans up blocked user records

- **File:** `src/app/api/test/cleanup/route.ts`
  - **Line 19:** `prisma.users.deleteMany()` - Cleans up test users

### Raw SQL DELETE Operations

#### Subscription Management
- **File:** `src/console/commands/eval-user-subscription.command.ts`
  - **Lines 53, 133:** `DELETE FROM "subscriptionPlanEnrollments"` - Removes expired subscriptions

#### Notifications
- **File:** `src/server-side-helpers/messages.helpers.ts`
  - **Line 545:** `DELETE FROM "notifications"` - Removes match-related notifications using raw SQL

#### Test Operations
- **File:** `e2e/utils/test-db.ts`
  - **Line 21:** `DELETE FROM users WHERE email` - Cleans up test users

## Transaction Operations

### Database Transactions
- **File:** `src/server-side-helpers/messages.helpers.ts`
  - **Line 137:** `prisma.$transaction()` - Creates messages within database transactions

## Raw Query Operations

### Complex Queries with Potential for Data Modification Context
- **File:** `src/server-side-helpers/notification.helper.ts`
  - **Lines 58, 141, 220:** `prisma.$queryRaw` - Complex notification and match queries

- **File:** `src/server-side-helpers/messages.helpers.ts`
  - **Line 49:** `prisma.$queryRaw` - Complex conversation queries

- **File:** `src/app/registration/registration-form-actions.ts`
  - **Line 80:** `prisma.$queryRaw` - User creation with geolocation

## Key Observations

1. **Mixed Approach**: The codebase uses both Prisma ORM operations and raw SQL queries, with raw SQL primarily used for complex geolocation operations and bulk operations.

2. **Proper Transaction Usage**: Database transactions are used appropriately for message creation to ensure data consistency.

3. **Test Data Management**: Comprehensive test utilities for creating and cleaning up test data in both unit tests and e2e tests.

4. **Security**: All queries use parameterized queries to prevent SQL injection attacks.

5. **Business Logic**: Database operations cover user management, messaging, matching, billing, notifications, and subscription management.

6. **Geolocation**: Special handling for geolocation data using PostGIS functions in raw SQL queries.

7. **Consistent Patterns**: The database operations follow consistent patterns with proper separation of concerns and error handling throughout the application layers.

## Usage Guidelines

- When making schema changes, remember to update the database directly using MCP tools as per project instructions
- All field names in raw queries should be surrounded with double quotes to preserve camel-casing
- Follow existing patterns for new database operations
- Use transactions for operations that require data consistency
- Test database operations thoroughly, especially for user-facing features