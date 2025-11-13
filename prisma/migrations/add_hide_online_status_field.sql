-- Add hideOnlineStatus field to users table
ALTER TABLE users ADD COLUMN "hideOnlineStatus" BOOLEAN NOT NULL DEFAULT false;

-- Add index for performance if needed
CREATE INDEX users_hideonlinestatus_index ON users("hideOnlineStatus");
