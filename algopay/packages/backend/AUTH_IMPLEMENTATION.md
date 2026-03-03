# Authentication Implementation Status

## Overview

This document describes the current authentication implementation for Algopay and the path to production integration with GoPlausible doAuth.

## Current Implementation (Phase 2.1 - Development)

### Architecture

```
User → Backend (FastAPI)
         ↓
    Mock OTP Flow (Development)
         ↓
    Intermezzo (Algorand Foundation Custodial API)
         ↓
    HashiCorp Vault (Key Storage)
```

### What's Working

✅ **Email-based login flow**
- POST `/api/v1/auth/login` - Initiates login with email
- Generates local flowId for session tracking
- Mock OTP email notification (placeholder for production email service)

✅ **OTP verification**
- POST `/api/v1/auth/verify` - Verifies OTP and creates session
- Accepts any 6-digit OTP for development testing
- Creates JWT session token

✅ **Intermezzo integration**
- Connects to Intermezzo on `localhost:3000`
- Authenticates with Vault token
- Creates/retrieves wallet for authenticated users
- All keys stored securely in HashiCorp Vault

✅ **JWT session management**
- Bearer token authentication
- 24-hour token expiry
- Protected endpoint middleware

✅ **Test coverage**
- 14/14 tests passing
- Covers login, verify, and middleware flows
- Mocked external dependencies

### Configuration

Required environment variables:

```bash
# JWT Configuration
JWT_SECRET_KEY=your-secret-key-change-in-production

# Intermezzo Configuration (Production-ready)
INTERMEZZO_URL=http://localhost:3000
INTERMEZZO_VAULT_TOKEN=your-vault-token
INTERMEZZO_VAULT_ROLE_ID=your-vault-role-id
INTERMEZZO_VAULT_SECRET_ID=your-vault-secret-id

# GoPlausible doAuth (Future - not yet available)
GOPLAUSIBLE_AUTH_URL=
GOPLAUSIBLE_CLIENT_ID=
GOPLAUSIBLE_CLIENT_SECRET=
```

## Production Architecture (Target)

### Full Stack Flow

```
User → Backend (FastAPI)
         ↓
    GoPlausible doAuth (OAuth/OIDC + OTP)
         ↓
    Intermezzo Session (flowId)
         ↓
    Intermezzo (Algorand Foundation Custodial API)
         ↓
    HashiCorp Vault (Key Storage)
```

### Production Flow (from agents.md)

1. **Login Initiation**
   ```
   POST /api/v1/auth/login
   {
     "email": "user@example.com",
     "network": "testnet"
   }
   ```
   - Backend calls GoPlausible doAuth API
   - GoPlausible sends OTP email to user
   - Returns `flowId` (Intermezzo session ID)

2. **OTP Verification**
   ```
   POST /api/v1/auth/verify
   {
     "flowId": "gp_flow_abc123",
     "otp": "123456"
   }
   ```
   - Backend verifies OTP with GoPlausible
   - GoPlausible confirms authentication
   - Intermezzo creates/attaches wallet to user's email identity
   - Backend issues JWT session token

3. **Authenticated Requests**
   ```
   GET /api/v1/wallet/balance
   Authorization: Bearer <jwt_token>
   ```
   - JWT contains email, wallet address, network
   - Backend validates token
   - Routes requests to Intermezzo for signing

## What Needs to Change for Production

### 1. GoPlausible doAuth Integration

**Status:** API not yet publicly available

**Required changes in `auth.py`:**

```python
# Replace mock implementation in call_goplausible_auth()
async def call_goplausible_auth(email: str, network: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GOPLAUSIBLE_AUTH_URL}/api/v1/auth/initiate",  # Actual endpoint TBD
            json={
                "email": email,
                "network": network,
                "client_id": GOPLAUSIBLE_CLIENT_ID
            },
            headers={
                "Authorization": f"Bearer {GOPLAUSIBLE_CLIENT_SECRET}"
            }
        )
        return response.json()

# Replace mock implementation in verify_goplausible_otp()
async def verify_goplausible_otp(flow_id: str, otp: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GOPLAUSIBLE_AUTH_URL}/api/v1/auth/verify",  # Actual endpoint TBD
            json={
                "flowId": flow_id,
                "otp": otp,
                "client_id": GOPLAUSIBLE_CLIENT_ID
            },
            headers={
                "Authorization": f"Bearer {GOPLAUSIBLE_CLIENT_SECRET}"
            }
        )
        return response.json()
```

**Waiting on:**
- GoPlausible doAuth API documentation
- Public API endpoints
- OAuth client credentials

### 2. Email Service Integration

**Status:** Mock implementation

**Required:**
- Integrate with SendGrid, AWS SES, or similar
- Send actual OTP codes via email
- Store OTP codes securely (Redis/database)
- Implement OTP expiry (5-10 minutes)

### 3. Database Integration

**Status:** In-memory storage (development only)

**Required:**
- PostgreSQL database setup
- User table (email, wallet_address, created_at, etc.)
- Session table (flow_id, email, otp_hash, expires_at, verified)
- Replace `auth_flows` dict with database queries

### 4. Vault Approle Authentication

**Status:** Using static vault token

**Required:**
- Implement Vault approle authentication
- Use `INTERMEZZO_VAULT_ROLE_ID` and `INTERMEZZO_VAULT_SECRET_ID`
- Rotate credentials regularly
- See: https://github.com/algorandfoundation/intermezzo

### 5. User-Specific Wallets

**Status:** Using manager wallet for all users (development)

**Required:**
- Create user-specific wallets in Vault
- Map email → wallet address in database
- Implement wallet creation on first login
- Support multiple wallets per user (optional)

## Testing Strategy

### Current Tests (14 passing)

- ✅ Login with valid email
- ✅ Login with invalid email format
- ✅ Login without email field
- ✅ Login defaults to testnet
- ✅ Login when GoPlausible unavailable
- ✅ Verify with valid OTP
- ✅ Verify with invalid flow ID
- ✅ Verify with wrong OTP
- ✅ Verify without OTP field
- ✅ Verify when Intermezzo unavailable
- ✅ Protected endpoint requires auth
- ✅ Valid token grants access
- ✅ Invalid token rejected
- ✅ Missing Bearer prefix rejected

### Additional Tests Needed

- [ ] OTP expiry (10 minutes)
- [ ] Flow expiry (10 minutes)
- [ ] Duplicate OTP verification
- [ ] Concurrent login attempts
- [ ] Token refresh flow
- [ ] Logout functionality
- [ ] Rate limiting on login/verify
- [ ] Email validation edge cases

## Security Considerations

### Current Implementation

✅ **Keys never leave Vault**
- All signing happens in Intermezzo
- No private keys in backend code
- Vault provides TEE-like security

✅ **JWT tokens**
- Signed with secret key
- 24-hour expiry
- Contains minimal user data

✅ **HTTPS required in production**
- All API calls must use TLS
- Protect tokens in transit

### Production Requirements

⚠️ **Rate limiting**
- Limit login attempts per email (5/hour)
- Limit OTP verification attempts (3 per flow)
- Implement exponential backoff

⚠️ **OTP security**
- Use cryptographically secure random OTPs
- Hash OTPs before storing
- Single-use OTPs
- Short expiry (5-10 minutes)

⚠️ **Session management**
- Implement token refresh
- Logout endpoint to invalidate tokens
- Track active sessions per user
- Revoke compromised tokens

⚠️ **Audit logging**
- Log all authentication attempts
- Log wallet creation events
- Log failed OTP verifications
- Monitor for suspicious patterns

## References

- **Intermezzo:** https://github.com/algorandfoundation/intermezzo
- **GoPlausible:** https://github.com/goplausible
- **Architecture:** See `agents.md` in project root
- **Design:** See `.kiro/specs/algopay-agentic-wallet/design.md`

## Next Steps

1. ✅ Complete Phase 2.1 (Auth foundation) - DONE
2. ⏳ Wait for GoPlausible doAuth API availability
3. ⏳ Integrate email service (SendGrid/AWS SES)
4. ⏳ Set up PostgreSQL database
5. ⏳ Implement Vault approle authentication
6. ⏳ Move to Phase 3 (Wallet operations)

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| OTP Generation | Mock (any 6 digits) | Real OTP via email |
| OTP Verification | Local validation | GoPlausible doAuth |
| Session Storage | In-memory dict | PostgreSQL database |
| Wallet Creation | Manager wallet | User-specific wallets |
| Vault Auth | Static token | Approle rotation |
| Email Service | Mock message | SendGrid/AWS SES |
| Rate Limiting | None | Redis-based |
| Audit Logging | Basic logs | Structured logging |

---

**Last Updated:** 2026-02-26
**Status:** Phase 2.1 Complete - Ready for GoPlausible Integration
