-- Add customerProfileId field to billingInformationEntries table
ALTER TABLE "billingInformationEntries" ADD COLUMN "customerProfileId" VARCHAR(255);

-- Add unique constraint on customerProfileId
ALTER TABLE "billingInformationEntries" ADD CONSTRAINT "billingInformationEntries_customerProfileId_unique" UNIQUE ("customerProfileId");

-- Add index for performance
CREATE INDEX "billingInformationEntries_customerProfileId_index" ON "billingInformationEntries"("customerProfileId"); 