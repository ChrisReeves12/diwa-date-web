# PayPal Server-Side Subscription Integration

This document describes the complete server-side PayPal subscription integration that replaces the client-side PayPal button integration.

## Overview

The system now uses PayPal's REST API to create and manage subscriptions entirely server-side, providing better control and a more consistent user experience.

## Changes Made

### 1. Database Schema Updates

**File:** `prisma/schema.prisma`
- Added `paypalPlanId` field to `subscriptionPlans` model
- This field stores the PayPal Plan ID for each subscription tier

**Migration File:** `prisma/migrations/add_paypal_plan_id_to_subscription_plans.sql`
```sql
ALTER TABLE "subscriptionPlans" ADD COLUMN "paypalPlanId" VARCHAR(255);
CREATE INDEX "subscriptionplans_paypalplanid_index" ON "subscriptionPlans" ("paypalPlanId");
```

**To apply the migration:**
```bash
# Using psql
psql $DATABASE_URL -f prisma/migrations/add_paypal_plan_id_to_subscription_plans.sql

# Or using your database tool of choice
```

### 2. PayPal Helper Functions

**File:** `src/server-side-helpers/paypal.helpers.ts`

New functions added:
- `createPayPalSubscription()` - Creates a subscription and returns approval URL
- `verifyPayPalSubscription()` - Verifies subscription after user approval
- `cancelPayPalSubscription()` - Cancels a subscription (already existed, now enhanced)
- `getPayPalSubscriptionDetails()` - Retrieves subscription details from PayPal

### 3. Server Actions

**File:** `src/app/account/billing/billing.actions.ts`

New/Updated actions:
- `initiatePayPalSubscription(planId)` - Creates PayPal subscription and returns approval URL
- `handlePayPalSubscription(subscriptionId, planId)` - Enhanced to verify subscription before enrollment
- `cancelSubscription()` - Now cancels on PayPal's end via API
- `reactivateSubscription()` - Blocks reactivation for PayPal subscriptions (not supported by PayPal)
- `getSubscriptionPlans()` - Now includes `paypalPlanId` field

### 4. Callback Route

**File:** `src/app/account/billing/paypal-return/page.tsx`

New route that handles the return from PayPal after user approves subscription.
- Verifies subscription with PayPal
- Creates enrollment in database
- Redirects to billing page with success/error message

### 5. Frontend Updates

**File:** `src/app/account/billing/billing-information.tsx`

Changes:
- Removed PayPal SDK loading
- Removed PayPal button containers
- Added custom "Subscribe with PayPal" buttons
- Added `handleSubscribe()` function to initiate subscription
- Added URL parameter handling for success/error messages from callback
- Updated `SubscriptionPlan` interface to include `paypalPlanId`

### 6. Environment Variables

**File:** `env.example`

Added:
```env
# PayPal Configuration
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_API_BASE_URL=https://api-m.paypal.com
```

## Setup Instructions

### 1. Configure Environment Variables

Add to your `.env` file:
```env
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_API_BASE_URL=https://api-m.paypal.com
```

For testing, use the sandbox:
```env
PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
```

Get your credentials from: https://developer.paypal.com/dashboard/applications

### 2. Apply Database Migration

```bash
psql $DATABASE_URL -f prisma/migrations/add_paypal_plan_id_to_subscription_plans.sql
```

### 3. Create PayPal Plans

You need to create subscription plans in PayPal Dashboard or via API:

**Option A: Using PayPal Dashboard**
1. Go to https://www.paypal.com/billing/plans
2. Create a plan for each subscription tier
3. Copy the Plan ID (format: `P-XXXXXXXXXXXXXXXXXXXX`)

**Option B: Using PayPal API**
```bash
# See PayPal documentation for creating plans via API
# https://developer.paypal.com/docs/subscriptions/integrate/
```

### 4. Update Database with PayPal Plan IDs

```sql
UPDATE "subscriptionPlans" 
SET "paypalPlanId" = 'P-YOUR-PLAN-ID-HERE' 
WHERE id = 1;

-- Repeat for each subscription plan
```

### 5. Restart Your Application

```bash
npm run dev  # or your production start command
```

## How It Works

### Subscription Flow

1. **User clicks "Subscribe with PayPal"**
   - Frontend calls `initiatePayPalSubscription(planId)`
   - Server creates subscription via PayPal API
   - Server returns approval URL
   - User is redirected to PayPal

2. **User approves on PayPal**
   - PayPal redirects to `/account/billing/paypal-return?subscription_id=XXX&planId=YYY`
   - Server verifies subscription with PayPal
   - Server creates enrollment in database
   - User is redirected to `/account/billing?success=true`

3. **Subscription is active**
   - User sees premium features
   - PayPal handles recurring billing automatically

### Cancellation Flow

1. **User clicks "Cancel Subscription"**
   - Frontend calls `cancelSubscription()`
   - Server cancels on PayPal via API
   - If PayPal cancellation succeeds, local database is updated
   - If PayPal cancellation fails, error is returned to user

2. **Subscription ends**
   - Subscription remains active until next payment date
   - User loses premium access on `endsAt` date

### Reactivation

- PayPal subscriptions **cannot be reactivated** once cancelled
- Users attempting to reactivate will see: "PayPal subscriptions cannot be reactivated once cancelled. Please create a new subscription below."
- User must create a new subscription

## API Endpoints Used

- `POST /v1/oauth2/token` - Get access token
- `POST /v1/billing/subscriptions` - Create subscription
- `GET /v1/billing/subscriptions/{id}` - Get subscription details
- `POST /v1/billing/subscriptions/{id}/cancel` - Cancel subscription

## Error Handling

All functions return consistent error objects:
```typescript
{
    success: boolean;
    error?: string;
    // Additional fields depending on function
}
```

Errors are displayed to users via the billing page's error message system.

## Testing

### Test with PayPal Sandbox

1. Use sandbox credentials in environment variables
2. Create test buyer account at https://developer.paypal.com/dashboard/accounts
3. Use test buyer account to complete subscription flow
4. Verify subscription in sandbox dashboard

### Test Scenarios

- ✅ Create subscription
- ✅ Approve subscription on PayPal
- ✅ Cancel subscription
- ✅ Attempt to reactivate (should fail with helpful message)
- ✅ Error handling (invalid plan ID, network errors, etc.)

## Troubleshooting

### "Missing required PayPal environment variables"
- Check that `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set in `.env`

### "This plan does not have PayPal configured"
- Update the subscription plan in database with `paypalPlanId`

### "Failed to verify PayPal subscription"
- Check that subscription was approved on PayPal
- Verify PayPal credentials are correct
- Check PayPal API logs in dashboard

### TypeScript errors about `paypalPlanId`
- Restart TypeScript server in your IDE
- Run `npm run build` to verify

## Security Considerations

- ✅ All PayPal operations happen server-side
- ✅ Subscriptions are verified with PayPal before enrollment
- ✅ Client cannot manipulate subscription details
- ✅ PayPal credentials are never exposed to client
- ✅ Callback route verifies user authentication

## Next Steps

1. Apply the database migration
2. Configure PayPal credentials in `.env`
3. Create PayPal plans and update database
4. Test the full flow in sandbox
5. Deploy to production
6. Switch to production PayPal credentials

## Support

For PayPal API documentation, visit:
- https://developer.paypal.com/docs/subscriptions/
- https://developer.paypal.com/api/subscriptions/

For issues with this integration, check the server logs for detailed error messages.

