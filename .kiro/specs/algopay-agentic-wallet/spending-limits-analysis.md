# Coinbase AWAL Spending Limits Analysis

## How Coinbase Enforces Spending Limits

Based on research of Coinbase's Agentic Wallet (AWAL) and CDP infrastructure, here's how they implement spending limits:

## 1. Spend Permissions (Smart Contract Level)

Coinbase uses **Spend Permissions** - an on-chain smart contract mechanism deployed on Base and other EVM chains.

### Key Components:

**Account & Spender Model:**
- **Account**: The smart wallet that creates and approves the permission
- **Spender**: The entity (agent/bot) that can spend within defined limits

**Permission Parameters:**
```typescript
{
  spender: "0x...",           // Who can spend
  token: "USDC",              // What token
  allowance: "1000000",       // Amount (in smallest unit)
  periodInDays: 1,            // Time period (daily/weekly)
  start: timestamp,           // When permission starts
  end: timestamp              // When permission expires
}
```

### Enforcement Location:
- **On-chain**: Evaluated entirely through smart contracts
- **Transparent**: All checks happen on blockchain
- **Decentralized**: No centralized authority needed

### How It Works:
1. User creates Spend Permission with limits
2. Permission is signed and stored on-chain
3. When agent tries to spend, smart contract checks:
   - Is spender authorized?
   - Is current time within start/end?
   - Has allowance been exceeded in current period?
4. Transaction reverts if any check fails

## 2. CDP Policies (Off-Chain TEE Level)

Coinbase also uses **Policies** evaluated in their Trusted Execution Environment (TEE).

### Key Differences from Spend Permissions:

| Feature | Spend Permissions | CDP Policies |
|---------|------------------|--------------|
| **Evaluation** | On-chain (smart contract) | Off-chain (TEE) |
| **Scope** | Token spending only | Any transaction type |
| **Flexibility** | Token, amount, time | Full transaction control |
| **Chains** | EVM only | EVM + Solana |
| **Transparency** | Fully transparent | Trusted infrastructure |

### Policy Types:
- **USD Spend Limits**: Restrict amount in USD per transaction
- **Transaction Type Limits**: Control what operations are allowed
- **Rate Limits**: Limit transactions per time period
- **Allowlist/Blocklist**: Control which addresses can be interacted with

## 3. Session-Based Limits

From the documentation, AWAL mentions "session spending caps":

```
"session spending caps, enabling machine-to-machine 
payments and programmatic access without intervention"
```

This suggests:
- Limits are tied to authentication sessions
- Each session has its own spending budget
- Sessions expire after a period (likely 7 days based on CDP docs)

## 4. KYT (Know Your Transaction) Screening

Coinbase implements automatic transaction screening:
- **Pre-transaction checks**: Before signing
- **Risk assessment**: Analyze transaction patterns
- **Blocklist validation**: Check against known bad actors
- **Automatic blocking**: High-risk transactions rejected

## Implementation Strategy for Algopay

Based on Coinbase's approach, here's how we should implement spending limits:

### Hybrid Approach (Recommended)

**Layer 1: Backend Guardrails (Pre-Signing)**
```python
class GuardrailEngine:
    async def validate_transaction(self, tx: Transaction, user: User):
        # Check 1: Daily spending limit
        daily_spent = await self.get_daily_spent(user.id)
        if daily_spent + tx.amount > user.daily_limit:
            raise SpendingLimitExceeded("Daily limit exceeded")
        
        # Check 2: Per-transaction limit
        if tx.amount > user.per_tx_limit:
            raise SpendingLimitExceeded("Transaction limit exceeded")
        
        # Check 3: Session limit
        session_spent = await self.get_session_spent(user.session_id)
        if session_spent + tx.amount > user.session_limit:
            raise SpendingLimitExceeded("Session limit exceeded")
        
        # Check 4: Blocklist
        if await self.is_blocklisted(tx.recipient):
            raise BlocklistedRecipient("Recipient is blocklisted")
        
        # Check 5: KYT screening
        risk_score = await self.assess_risk(tx)
        if risk_score > RISK_THRESHOLD:
            raise HighRiskTransaction("Transaction flagged as high risk")
        
        return True
```

**Layer 2: ARC-58 Smart Wallet (On-Chain)**
```python
# Store limits in smart wallet state
class ARC58Wallet:
    state = {
        "daily_limit": 100_000_000,      # 100 USDC
        "per_tx_limit": 10_000_000,      # 10 USDC
        "daily_spent": 0,
        "last_reset": timestamp,
        "owner": address,
        "authorized_spenders": [backend_address]
    }
    
    def before_transaction(self, tx):
        # Reset daily counter if needed
        if current_time - self.state["last_reset"] > 86400:
            self.state["daily_spent"] = 0
            self.state["last_reset"] = current_time
        
        # Check limits
        assert tx.amount <= self.state["per_tx_limit"]
        assert self.state["daily_spent"] + tx.amount <= self.state["daily_limit"]
        
        # Update spent amount
        self.state["daily_spent"] += tx.amount
```

**Layer 3: Intermezzo Enforcement (Signing Level)**
```python
# Intermezzo validates before signing
class IntermezzoClient:
    async def sign_transaction(self, unsigned_tx, context):
        # Check if user has permission
        user = await self.get_user(context.user_id)
        
        # Validate against stored limits
        if not await self.validate_limits(user, unsigned_tx):
            raise SigningRejected("Transaction exceeds limits")
        
        # Sign with Vault
        signed_tx = await self.vault.sign(unsigned_tx)
        
        # Log for audit
        await self.audit_log.record(user, unsigned_tx, signed_tx)
        
        return signed_tx
```

## Key Differences: Algopay vs AWAL

| Feature | AWAL (Coinbase) | Algopay (Our Implementation) |
|---------|-----------------|------------------------------|
| **Primary Enforcement** | Smart contract (Spend Permissions) | Backend + Intermezzo |
| **Secondary Layer** | CDP Policies (TEE) | ARC-58 Smart Wallet |
| **Blockchain** | Base (EVM) | Algorand |
| **Smart Contract** | Spend Permission Manager | ARC-58 Smart Wallet |
| **Key Storage** | CDP TEE | Intermezzo + Vault |
| **Limit Types** | Token, amount, time period | Daily, per-tx, session, custom |
| **Reset Logic** | On-chain (period-based) | Backend + on-chain |
| **KYT** | Automatic (CDP) | Backend + Intermezzo |

## Recommended Implementation Order

### Phase 1: Backend Guardrails (Week 6)
1. Database schema for limits
2. Validation middleware
3. Daily/per-tx limit checks
4. Session tracking
5. Basic blocklist

### Phase 2: Intermezzo Integration (Week 6)
1. Pass limit context to Intermezzo
2. Intermezzo validates before signing
3. Audit logging
4. Rejection handling

### Phase 3: ARC-58 On-Chain (Week 7)
1. Store limits in smart wallet state
2. On-chain validation logic
3. Atomic group with limit checks
4. State updates after transactions

### Phase 4: Advanced Features (Week 7-8)
1. Custom limits per user
2. Reputation-based adjustments
3. KYT risk scoring
4. Pattern detection
5. Alert system

## Configuration Example

```json
{
  "spending_limits": {
    "default": {
      "daily_limit_usdc": 100.0,
      "per_transaction_limit_usdc": 10.0,
      "session_limit_usdc": 50.0,
      "reset_period_hours": 24
    },
    "high_reputation": {
      "daily_limit_usdc": 1000.0,
      "per_transaction_limit_usdc": 100.0,
      "session_limit_usdc": 500.0
    },
    "new_user": {
      "daily_limit_usdc": 10.0,
      "per_transaction_limit_usdc": 5.0,
      "session_limit_usdc": 10.0
    }
  },
  "kyt": {
    "enabled": true,
    "risk_threshold": 75,
    "blocklist_check": true,
    "pattern_detection": true
  }
}
```

## API Endpoints for Limit Management

```python
# Get current limits
GET /api/v1/wallet/limits
Response: {
  "daily_limit": 100.0,
  "daily_spent": 45.0,
  "daily_remaining": 55.0,
  "per_tx_limit": 10.0,
  "session_limit": 50.0,
  "session_spent": 20.0,
  "reset_at": "2026-02-27T00:00:00Z"
}

# Update limits (admin/user with permission)
POST /api/v1/wallet/limits
Request: {
  "daily_limit": 200.0,
  "per_tx_limit": 20.0
}

# Get spending history
GET /api/v1/wallet/spending-history
Response: {
  "today": 45.0,
  "this_week": 250.0,
  "this_month": 890.0,
  "transactions": [...]
}
```

## Testing Strategy

```python
# Test: Spending limits enforcement
def test_daily_limit_enforced():
    # Send transactions up to limit
    for i in range(10):
        response = send_transaction(10.0)  # 10 USDC each
        if i < 10:  # Within 100 USDC limit
            assert response.status_code == 200
        else:  # Exceeds limit
            assert response.status_code == 400
            assert "daily limit" in response.json()["error"]

def test_limit_resets_daily():
    # Send transaction near limit
    send_transaction(95.0)
    
    # Try to send more (should fail)
    response = send_transaction(10.0)
    assert response.status_code == 400
    
    # Fast-forward 24 hours
    time.sleep(86400)
    
    # Should work now
    response = send_transaction(10.0)
    assert response.status_code == 200

def test_custom_limits():
    # Set higher limit for high-reputation user
    set_user_limits(user_id, daily=1000.0)
    
    # Should allow larger transaction
    response = send_transaction(500.0)
    assert response.status_code == 200
```

## Security Considerations

1. **Defense in Depth**: Multiple layers (backend, Intermezzo, on-chain)
2. **Fail Secure**: If any layer fails, transaction is rejected
3. **Audit Trail**: All limit checks logged
4. **Rate Limiting**: Prevent rapid-fire attempts to bypass limits
5. **Anomaly Detection**: Flag unusual spending patterns
6. **Admin Override**: Emergency controls for suspicious activity

## Summary

Coinbase uses a **hybrid approach**:
- **Primary**: On-chain Spend Permissions (smart contract)
- **Secondary**: Off-chain CDP Policies (TEE)
- **Tertiary**: Session-based caps

For Algopay, we'll implement:
- **Primary**: Backend guardrails (pre-signing validation)
- **Secondary**: Intermezzo enforcement (signing-level checks)
- **Tertiary**: ARC-58 on-chain validation (belt-and-suspenders)

This gives us the security of Coinbase's approach while leveraging Algorand's advantages (faster, cheaper, atomic groups for fee pooling).
