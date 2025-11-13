-- Add PayPal subscription ID field to subscriptionPlanEnrollments table
-- This field will store the PayPal subscription ID for tracking subscriptions

ALTER TABLE "subscriptionPlanEnrollments" 
ADD COLUMN "paypalSubscriptionId" VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX "subscriptionplanenrollments_paypalsubscriptionid_index" 
ON "subscriptionPlanEnrollments" ("paypalSubscriptionId");

-- Make payment method fields optional in billingInformationEntries (if not already done)
ALTER TABLE "billingInformationEntries" 
ALTER COLUMN "paymentMethod" DROP NOT NULL,
ALTER COLUMN "cclast4" DROP NOT NULL;
