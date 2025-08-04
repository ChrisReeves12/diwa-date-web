# 2FA Implementation Plan for Diwa Date

## **Task 1: Database Schema Changes**

### **1.1 Create Prisma Migration**
- Create migration file: `prisma/migrations/add_2fa_fields.sql`
- Add the following fields to the `users` table:
  - `require2fa` BOOLEAN NOT NULL DEFAULT false
  - `twoFactorCode` VARCHAR(6) (stores the current 6-digit code)
  - `twoFactorCodeExpiry` TIMESTAMP (code expiration time)
  - `twoFactorCodeAttempts` INTEGER DEFAULT 0 (rate limiting)
  - `lastTwoFactorCodeSentAt` TIMESTAMP (prevent spam)

### **1.2 Update Prisma Schema**
- Add the new fields to the `users` model in `prisma/schema.prisma`
- Add appropriate indexes for performance

### **1.3 Update TypeScript Types**
- Add the new fields to `User` interface in `src/types/user.interface.ts`

## **Task 2: 2FA Helper Functions**

### **2.1 Create Two-Factor Helper Module**
Create `src/server-side-helpers/two-factor.helpers.ts`:
- `generateTwoFactorCode()`: Generate secure 6-digit codes using crypto.randomInt()
- `sendTwoFactorCode(email, code)`: Email the code using existing Mailgun setup
- `validateTwoFactorCode(userId, inputCode)`: Verify code with rate limiting and expiration
- `cleanupExpiredCodes()`: Remove expired codes
- `canRequestNewCode(userId)`: Check cooldown period

### **2.2 Create Email Template**
- Design 2FA code email template in `mail.helper.ts`
- Include code expiration time (5 minutes)
- Add security notice about not sharing codes
- Use existing email template structure

## **Task 3: Authentication Flow Updates**

### **3.1 Modify Core Authentication**
Update `src/server-side-helpers/user.helpers.ts`:
- Modify `authenticateUser()` to check for 2FA requirement
- Return intermediate state when 2FA is required but not completed
- Add `completeTwoFactorAuth(userId, code)` function
- Update session creation to handle 2FA workflow

### **3.2 Update Login Actions**
Modify `src/app/login/login.actions.ts`:
- Handle 2FA-required response from authentication
- Add action for 2FA code verification
- Manage temporary session state for pending 2FA

## **Task 4: Frontend Settings UI**

### **4.1 Add 2FA Settings Section**
Modify `src/app/account/settings/general-settings.tsx`:
- Add 2FA toggle section between password and profile status sections
- Include current 2FA status display
- Add enable/disable functionality with password confirmation
- Show security warnings and benefits

### **4.2 Create Server Actions for 2FA Settings**
Create functions in `src/common/server-actions/user.actions.ts`:
- `enableTwoFactor(password)`: Enable 2FA after password verification
- `disableTwoFactor(password)`: Disable 2FA with password confirmation
- Include proper error handling and validation

## **Task 5: Login Flow Enhancement**

### **5.1 Update Login Form**
Modify `src/app/login/login-form.tsx`:
- Add conditional 2FA code input field
- Implement multi-step form state (email/password → 2FA code)
- Add "Resend Code" functionality
- Update form validation and error handling

### **5.2 Create 2FA Verification Actions**
Add to `src/app/login/login.actions.ts`:
- `verifyTwoFactorCode(userId, code)`: Complete 2FA verification
- `resendTwoFactorCode(userId)`: Request new code with rate limiting
- Handle all 2FA-related login errors

## **Task 6: Security Implementation**

### **6.1 Rate Limiting & Protection**
- Implement attempt limits (max 5 attempts per code)
- Add cooldown period for code requests (1 minute between sends)
- Automatic account protection after repeated failures
- Clear expired codes and attempts regularly

### **6.2 Audit Logging**
- Log all 2FA events (enable/disable, code requests, verification attempts)
- Track failed attempts for security monitoring
- Use existing logging infrastructure in `logging.helpers.ts`

## **Task 7: Error Handling & UX**

### **7.1 Comprehensive Error States**
- Invalid/expired code messages
- Too many attempts warnings
- Network/email delivery issues
- Clear user guidance for each error state

### **7.2 User Experience Enhancements**
- Auto-focus 2FA input field
- Code input formatting (XXX-XXX)
- Clear instructions and help text
- Smooth transitions between authentication steps

## **Task 8: Database Migration Execution**

### **8.1 Migration Preparation**
- Test migration on development database
- Verify backward compatibility
- Prepare rollback plan if needed

### **8.2 Production Deployment**
- Execute migration during maintenance window
- Verify all existing functionality remains intact
- Monitor for any performance impacts

## **Implementation Dependencies**

- **Task 1** must complete before any other tasks can begin
- **Tasks 2-3** can be developed in parallel after Task 1
- **Task 4** depends on completion of Task 2 (server actions)
- **Task 5** depends on completion of Task 3 (authentication updates)
- **Tasks 6-7** can be implemented alongside Tasks 4-5
- **Task 8** should be the final step after all development is complete

## **Key Security Considerations**

- **Code Expiration**: 5-minute expiry for 2FA codes
- **Rate Limiting**: Max 5 verification attempts per code, 1-minute cooldown between code requests
- **Secure Generation**: Use crypto.randomInt() for code generation
- **Audit Logging**: Track all 2FA events for security analysis
- **Recovery Method**: Require password confirmation to disable 2FA
- **Email Security**: Clear messaging about not sharing codes

## **Database Migration Strategy**

The migration will be backward compatible, with `require2fa` defaulting to `false` for all existing users. The new fields will be nullable except for `require2fa`, ensuring no disruption to existing functionality.

This implementation leverages the existing authentication infrastructure while adding robust 2FA capabilities that integrate seamlessly with the current user experience while maintaining backward compatibility.
