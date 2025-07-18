# Subscription Enrollment Payment Processing Implementation Plan

## Overview
This document outlines the implementation plan for adding payment processing to the subscription enrollment flow in `billing.actions.ts`. The implementation will follow the same pattern used in `eval-user-subscription.command.ts` for consistency.

## Current State
- The `enrollInSubscriptionPlan` function in `billing.actions.ts` creates subscription records but has no payment processing
- Contains TODO comment: "In the future, integrate with payment processor here"
- Missing receipt generation and email notifications

## Implementation Tasks

### High Priority Items

1. **Add payment processing during subscription enrollment**
   - Location: `enrollInSubscriptionPlan` function in `billing.actions.ts:650`
   - Replace TODO comment with actual payment processing logic

2. **Import required functions**
   - Add `chargeCustomerByBillingEntry` from `@/server-side-helpers/billing.helpers`
   - Add `sendEmail` from `@/server-side-helpers/mail.helper`
   - Add `moment` for date formatting

3. **Add transaction handling logic**
   - Charge customer for subscription price using their billing entry
   - Handle the payment response and transaction details

4. **Add payment success/failure validation**
   - Check `responseCode` from payment transaction
   - Code `'1'` = success, `'4'` = under review, other = failure

5. **Handle failed payments**
   - Prevent enrollment for declined payments
   - Return appropriate error messages to user

6. **Add proper error handling**
   - Catch and handle payment processing failures
   - Log errors appropriately

### Medium Priority Items

7. **Handle payments under review (response code 4)**
   - Allow enrollment but track review status
   - Insert record into `billingHolds` table
   - Send notification email about review

8. **Add receipt generation and email sending**
   - Generate receipt HTML for successful payments
   - Send receipt email to customer
   - Include transaction details, dates, amounts

9. **Create receipt HTML generation function**
   - Similar to `generateReceiptHtml` in eval command
   - Include receipt number, dates, plan details, payment method

10. **Add billingHolds table insertion**
    - Track payments under review
    - Include user ID, enrollment ID, reason, response code, amount, plan name

11. **Handle free subscriptions (price = 0)**
    - Skip payment processing for free plans
    - Still create enrollment record and send confirmation

### Low Priority Items

12. **Add transaction logging and audit trail**
    - Log payment attempts and results
    - Create audit trail for enrollment payments

## Implementation Details

### Payment Processing Flow
1. Validate billing information is complete
2. Check subscription plan exists and get price
3. If price > 0, process payment using `chargeCustomerByBillingEntry`
4. Check payment response code:
   - `'1'`: Success - create enrollment, send receipt
   - `'4'`: Under review - create enrollment, add billing hold, send review email
   - Other: Failure - return error, don't create enrollment
5. If price = 0, skip payment and create enrollment

### Database Updates
- Create or update `subscriptionPlanEnrollments` record
- Insert `billingHolds` record for payments under review
- Update `lastPaymentAt` and `nextPaymentAt` dates

### Email Notifications
- Success: Receipt email with transaction details
- Under review: Review notification email
- Failure: Error returned to user interface

## Code Structure
The implementation will follow the same pattern as `eval-user-subscription.command.ts`:
- Payment processing logic
- Response code validation
- Receipt generation
- Email sending
- Error handling

## Testing Considerations
- Test with different subscription plans (free and paid)
- Test payment success, failure, and under review scenarios
- Test email generation and sending
- Test error handling for various failure modes