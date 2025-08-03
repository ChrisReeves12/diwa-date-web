# Session Tracking Implementation Plan

## Overview
Implement session tracking by saving user session data to the `sessions` database table when users log in. This will provide logging and audit capabilities for user sessions.

## Current Architecture Analysis

**Current Session Management:**
- Sessions are currently stored in Redis using `session.helpers.ts`
- Session IDs are generated using crypto random bytes (40 hex characters)
- Session data includes: `userId`, `email`, `createdAt`
- Sessions are stored with Redis expiry for automatic cleanup

**Database Setup:**
- `sessions` table already exists with correct schema
- Prisma schema includes the sessions model
- PostgreSQL pools are configured (`pgDbReadPool`, `pgDbWritePool`)

## Implementation Steps

### 1. Create Session Database Helper Functions

**File:** `src/server-side-helpers/session-db.helpers.ts`

Create new helper functions to:
- Insert session records into the database
- Extract IP address from request headers
- Get IP geolocation data (country/city)
- Handle user agent parsing

**Key functions to implement:**
```typescript
async function createSessionRecord(sessionData: SessionInsertData): Promise<void>
function extractClientIP(request: NextRequest): string | null
async function getIPGeolocation(ipAddress: string): Promise<{country?: string, city?: string}>
function extractUserAgent(request: NextRequest): string
```

**IP2Location integration:**
```typescript
async function getIPGeolocation(ipAddress: string) {
  const response = await fetch(`https://api.ip2location.io/?key=${process.env.IP2LOCATION_KEY}&ip=${ipAddress}`);
  const data = await response.json();
  return {
    country: data.country_name,
    city: data.city_name
  };
}
```

### 2. Create IP Geolocation Service

**Use IP2Location API:**
- API key already configured: `process.env.IP2LOCATION_KEY`
- Endpoint: `https://api.ip2location.io/?key=${process.env.IP2LOCATION_KEY}&ip=${ipAddressToQuery}`
- Extract `country_name` for `ipGeoCountry`
- Extract `city_name` for `ipGeoCity`
- Handle API errors gracefully

### 3. Update Session Creation Flow

**Files to modify:**
- `src/server-side-helpers/session.helpers.ts`
- `src/app/login/login.actions.ts`

**Changes:**
1. Modify `createSession()` function to accept request data
2. Extract IP, user agent, and geolocation in `loginAction()`
3. Pass request data to session creation
4. Insert session record into database alongside Redis storage
5. Ensure that inserting of the record into database is non-blocking
6. If there is some type of error that occurs during this process, log the error but do not disrupt the user experience.

### 4. Add Request Data Extraction to Login

**File:** `src/app/login/login.actions.ts`

**Modifications:**
1. Import Next.js `headers()` function
2. Extract request headers for IP and user agent
3. Pass extracted data to `authenticateUser()`
4. Update `authenticateUser()` signature to accept request data

### 5. Update Type Definitions

**Files to modify:**
- `src/types/session.type.ts`
- `src/types/auth-result.type.ts`

**New types to add:**
```typescript
export interface SessionRequestData {
  ipAddress?: string;
  userAgent?: string;
  ipGeoCountry?: string;
  ipGeoCity?: string;
}

export interface SessionInsertData extends SessionRequestData {
  id: string;
  userId: number;
  payload: string;
  lastActivity: number;
}
```

### 6. Enhance Authentication Function

**File:** `src/server-side-helpers/user.helpers.ts`

**Changes:**
1. Update `authenticateUser()` to accept request data
2. Pass request data to `createSession()`
3. Ensure session creation includes database insert

### 7. Update Environment Variables

**Files to update:**
- `env.example`

**New variables:**
```
# IP2Location API (already configured)
IP2LOCATION_KEY=your_ip2location_api_key_here
```

Note: The API key is already configured in your `.env` file.

### 8. Verify Database Schema

Use MCP tools to verify the `sessions` table schema matches requirements:
- `id` (VARCHAR 255, Primary Key)
- `userId` (INTEGER, Foreign Key to users.id)
- `ipAddress` (VARCHAR 45)
- `userAgent` (TEXT)
- `payload` (TEXT, NOT NULL)
- `lastActivity` (INTEGER, NOT NULL)
- `ipGeoCountry` (VARCHAR 300)
- `ipGeoCity` (VARCHAR 300)

If any schema modifications are needed, apply them directly using MCP database tools.

### 9. Error Handling and Logging

**Considerations:**
- Database insert failures should not prevent login
- Log errors for session tracking failures
- Graceful degradation if IP geolocation fails
- Rate limiting for IP geolocation API calls

## Implementation Priority

### Phase 1: Core Session Database Insertion
1. Verify database schema using MCP tools
2. Create session database helpers
3. Update session creation to insert into database
4. Basic IP and user agent extraction
5. Integration with existing login flow

### Phase 2: Enhanced Data Collection
1. Add IP geolocation service
2. Implement rate limiting for geolocation
3. Enhanced error handling and logging
4. Manual testing and validation

## Technical Considerations

### Security
- Sanitize and validate IP addresses
- Limit geolocation API rate to prevent abuse
- Store minimal necessary data in session payload

### Performance
- Use connection pooling for database operations (already configured)
- Implement timeout for IP2Location API requests
- Cache geolocation results to reduce API calls
- Handle IP2Location rate limits appropriately

### Scalability
- Consider database indexing strategy for session queries
- Plan for session cleanup strategy (though not required initially)
- Monitor database growth and performance

### Data Privacy
- Consider data retention policies
- Implement appropriate logging levels
- Ensure compliance with privacy requirements

## File Structure

```
src/
├── server-side-helpers/
│   ├── session.helpers.ts (modify)
│   ├── session-db.helpers.ts (new)
│   └── user.helpers.ts (modify)
├── app/login/
│   └── login.actions.ts (modify)
├── types/
│   ├── session.type.ts (modify)
│   └── auth-result.type.ts (modify)
└── lib/
    └── postgres.ts (existing, no changes)
```

This implementation will provide comprehensive session tracking while maintaining the existing Redis-based session management system and ensuring minimal disruption to the current authentication flow.
