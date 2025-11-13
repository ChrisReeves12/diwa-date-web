-- Add PayPal Plan ID field to subscriptionPlans table
-- This field will store the PayPal plan ID for each subscription plan

-- Add the paypalPlanId column
ALTER TABLE "subscriptionPlans"
ADD COLUMN "paypalPlanId" VARCHAR(255);

-- Create an index for efficient lookups
CREATE INDEX "subscriptionplans_paypalplanid_index" 
ON "subscriptionPlans" ("paypalPlanId");

