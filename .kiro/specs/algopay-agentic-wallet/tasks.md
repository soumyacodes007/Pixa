# Algopay Implementation Tasks

## Phase 1: Foundation & Infrastructure (Week 1-2)

### Task 1.1: Project Setup & Repository Structure
**Priority:** Critical
**Estimated Time:** 4 hours
**Dependencies:** None

**Acceptance Criteria:**
- [x] Monorepo structure created with workspaces
- [x] TypeScript configuration for CLI
- [x] Python environment setup for backend
- [x] Docker setup for Intermezzo
- [ ] CI/CD pipeline configured
- [x] Development environment documented

**Test Strategy:**
- Verify all packages install successfully
- Run linting and type checking
- Build all components without errors

**Deliverables:**
```
algopay/
├── packages/
│   ├── cli/              # TypeScript CLI
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   ├── companion/ # Companion window (embedded web UI)
│   │   │   └── utils/
│   ├── backend/          # FastAPI backend
│   └── shared/           # Shared types
├── docker/
│   └── intermezzo/       # Intermezzo setup
└── docs/
```

---

### Task 1.2: Intermezzo Integration & Testing
**Priority:** Critical
**Estimated Time:** 8 hours
**Dependencies:** Task 1.1

**Acceptance Criteria:**
- [x] Intermezzo deployed locally via Docker
- [x] HashiCorp Vault configured
- [x] Test wallet created in Vault
- [x] Sign transaction endpoint tested
- [x] Error handling for Intermezzo failures
- [x] Connection retry logic implemented

**Test Strategy:**
```typescript
// Test: Intermezzo connection
describe('Intermezzo Client', () => {
  test('should connect to Intermezzo API', async () => {
    const client = new IntermezzoClient(config);
    const health = await client.healthCheck();
    expect(health.status).toBe('ok');
  });

  test('should create wallet in Vault', async () => {
    const wallet = await client.createWallet('test-user');
    expect(wallet.address).toMatch(/^[A-Z2-7]{58}$/);
  });

  test('should sign transaction', async () => {
    const unsignedTx = createTestTransaction();
    const signed = await client.signTransaction(unsignedTx);
    expect(signed.txID).toBeDefined();
  });
});
```

**Reference Code:**
- https://github.com/algorandfoundation/intermezzo
- Check REST API documentation
- Review WorldChess integration examples

---

### Task 1.3: Backend API Foundation (FastAPI)
**Priority:** Critical
**Estimated Time:** 6 hours
**Dependencies:** Task 1.2

**Acceptance Criteria:**
- [x] FastAPI app structure created
- [x] Health check endpoint working
- [ ] Database models defined (PostgreSQL)
- [ ] Environment configuration setup
- [x] Logging and monitoring configured
- [x] API documentation (OpenAPI/Swagger)

**Test Strategy:**
```python
# Test: Backend health check
def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_database_connection(client):
    response = client.get("/health/db")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"
```

**Deliverables:**
- FastAPI app running on localhost:8000
- Swagger docs at /docs
- Database migrations setup

---

## Phase 2: Authentication & Session Management (Week 2-3)

### Task 2.1: GoPlausible OAuth Integration
**Priority:** Critical
**Estimated Time:** 8 hours
**Dependencies:** Task 1.3

**Acceptance Criteria:**
- [ ] OAuth client configured for GoPlausible
- [x] Email OTP flow implemented
- [x] FlowId generation and storage
- [x] OTP validation logic
- [x] Session token (JWT) generation
- [ ] Token refresh mechanism

**Test Strategy:**
```python
# Test: Auth flow
def test_auth_login(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "network": "testnet"
    })
    assert response.status_code == 200
    assert "flowId" in response.json()

def test_auth_verify(client):
    # First login
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "test@example.com"
    })
    flow_id = login_resp.json()["flowId"]
    
    # Then verify (mock OTP)
    verify_resp = client.post("/api/v1/auth/verify", json={
        "flowId": flow_id,
        "otp": "123456"  # Mock OTP
    })
    assert verify_resp.status_code == 200
    assert "sessionToken" in verify_resp.json()
```

**Reference Code:**
- https://github.com/goplausible
- Check OAuth/OIDC documentation

---

### Task 2.2: CLI Authentication Commands
**Priority:** Critical
**Estimated Time:** 6 hours
**Dependencies:** Task 2.1

**Acceptance Criteria:**
- [ ] `algopay auth login <email>` command
- [ ] `algopay auth verify <flowId> <otp>` command
- [ ] Session storage in ~/.algopay/session.json
- [ ] Beautiful CLI output (colors, icons)
- [ ] JSON output mode (--json flag)
- [ ] Error handling with helpful messages

**Test Strategy:**
```typescript
// Test: CLI auth commands
describe('Auth Commands', () => {
  test('login command sends OTP', async () => {
    const result = await runCLI(['auth', 'login', 'test@example.com']);
    expect(result.stdout).toContain('Verification code sent');
    expect(result.stdout).toContain('Flow ID:');
  });

  test('verify command creates session', async () => {
    const result = await runCLI(['auth', 'verify', 'flow123', '123456']);
    expect(result.stdout).toContain('Authentication successful');
    
    // Check session file created
    const session = await loadSession();
    expect(session.email).toBe('test@example.com');
  });
});
```

---

### Task 2.3: Session Management & Middleware
**Priority:** High
**Estimated Time:** 4 hours
**Dependencies:** Task 2.1

**Acceptance Criteria:**
- [ ] JWT validation middleware
- [ ] Session expiry handling
- [ ] Auto-refresh for expired tokens
- [ ] Logout functionality
- [ ] Multi-device session support

**Test Strategy:**
```python
# Test: Session middleware
def test_protected_endpoint_requires_auth(client):
    response = client.get("/api/v1/wallet/balance")
    assert response.status_code == 401

def test_valid_token_grants_access(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get("/api/v1/wallet/balance", headers=headers)
    assert response.status_code == 200

def test_expired_token_rejected(client, expired_token):
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/v1/wallet/balance", headers=headers)
    assert response.status_code == 401
```

---

## Phase 3: Wallet Operations (Week 3-4)

### Task 3.1: Wallet Status & Balance
**Priority:** Critical
**Estimated Time:** 6 hours
**Dependencies:** Task 2.3

**Acceptance Criteria:**
- [ ] Query wallet from Intermezzo
- [ ] Fetch balance from Algorand indexer
- [ ] Support multiple assets (ALGO, USDC, ASAs)
- [ ] Calculate USD values
- [ ] Cache balance data (5 second TTL)

**Test Strategy:**
```python
# Test: Wallet endpoints
def test_get_wallet_status(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get("/api/v1/wallet/status", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "address" in data
    assert "balance" in data
    assert "status" in data

def test_get_balance(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get("/api/v1/wallet/balance", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "algo" in data
    assert "usdc" in data
```

**Reference Code:**
- algorand-mcp tools for indexer queries
- Check Algorand indexer API docs

---

### Task 3.2: CLI Wallet Commands
**Priority:** Critical
**Estimated Time:** 4 hours
**Dependencies:** Task 3.1

**Acceptance Criteria:**
- [ ] `algopay status` command
- [ ] `algopay balance` command
- [ ] `algopay address` command
- [ ] Beautiful formatted output
- [ ] JSON output support
- [ ] Network flag support (--network testnet)

**Test Strategy:**
```typescript
// Test: Wallet CLI commands
describe('Wallet Commands', () => {
  test('status shows wallet info', async () => {
    const result = await runCLI(['status']);
    expect(result.stdout).toContain('Algopay Wallet');
    expect(result.stdout).toContain('Authenticated');
  });

  test('balance shows assets', async () => {
    const result = await runCLI(['balance']);
    expect(result.stdout).toContain('ALGO');
    expect(result.stdout).toContain('USDC');
  });

  test('address shows wallet address', async () => {
    const result = await runCLI(['address']);
    expect(result.stdout).toMatch(/[A-Z2-7]{58}/);
  });
});
```

---

### Task 3.3: Send Transaction (Backend)
**Priority:** Critical
**Estimated Time:** 10 hours
**Dependencies:** Task 3.1

**Acceptance Criteria:**
- [ ] Build unsigned transaction with AlgoKit
- [ ] Implement fee pooling via atomic groups
- [ ] Send to Intermezzo for signing
- [ ] Broadcast signed transaction
- [ ] Transaction status tracking
- [ ] Guardrails enforcement (spending limits)

**Test Strategy:**
```python
# Test: Send transaction
def test_send_transaction(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/api/v1/wallet/send", 
        headers=headers,
        json={
            "to": "RECIPIENT_ADDRESS",
            "amount": 10.0,
            "asset": "USDC"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "txId" in data
    assert data["feePooled"] == True

def test_send_exceeds_limit(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/api/v1/wallet/send",
        headers=headers,
        json={
            "to": "RECIPIENT_ADDRESS",
            "amount": 1000000.0,  # Exceeds limit
            "asset": "USDC"
        }
    )
    assert response.status_code == 400
    assert "spending limit" in response.json()["error"].lower()
```

**Reference Code:**
- AlgoKit transaction builder
- Atomic group construction examples

---

### Task 3.4: Send Transaction (CLI)
**Priority:** Critical
**Estimated Time:** 6 hours
**Dependencies:** Task 3.3

**Acceptance Criteria:**
- [ ] `algopay send <amount> <recipient>` command
- [ ] Amount parsing (10, 10.00, $10)
- [ ] Address validation
- [ ] Confirmation prompt
- [ ] Progress indicator
- [ ] Transaction receipt display

**Test Strategy:**
```typescript
// Test: Send CLI command
describe('Send Command', () => {
  test('sends USDC successfully', async () => {
    const result = await runCLI([
      'send', '10', 'RECIPIENT_ADDRESS'
    ]);
    expect(result.stdout).toContain('Transaction confirmed');
    expect(result.stdout).toContain('Transaction ID:');
  });

  test('validates recipient address', async () => {
    const result = await runCLI(['send', '10', 'invalid']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Invalid address');
  });
});
```

---

## Phase 4: Trading & DEX Integration (Week 4-5)

### Task 4.1: Vestige MCP Integration
**Priority:** High
**Estimated Time:** 8 hours
**Dependencies:** Task 3.3

**Acceptance Criteria:**
- [ ] Vestige MCP client configured
- [ ] Get swap quote from Vestige
- [ ] Route optimization logic
- [ ] Price impact calculation
- [ ] Slippage tolerance handling

**Test Strategy:**
```python
# Test: Vestige integration
def test_get_swap_quote(vestige_client):
    quote = vestige_client.get_quote(
        from_asset="USDC",
        to_asset="ALGO",
        amount=10.0,
        slippage=0.01
    )
    assert quote["expectedOutput"] > 0
    assert quote["priceImpact"] < 0.05
    assert "route" in quote

def test_execute_swap(vestige_client):
    quote = vestige_client.get_quote("USDC", "ALGO", 10.0)
    result = vestige_client.execute_swap(quote)
    assert result["txId"] is not None
```

**Reference Code:**
- https://github.com/vestige-fi/vestige-mcp
- Vestige API documentation

---

### Task 4.2: Trade Endpoints (Backend)
**Priority:** High
**Estimated Time:** 8 hours
**Dependencies:** Task 4.1

**Acceptance Criteria:**
- [ ] POST /api/v1/trade/quote endpoint
- [ ] POST /api/v1/trade/execute endpoint
- [ ] Atomic group for swap + fee pooling
- [ ] Slippage protection
- [ ] Trade history tracking

**Test Strategy:**
```python
# Test: Trade endpoints
def test_get_trade_quote(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/api/v1/trade/quote",
        headers=headers,
        json={
            "fromAsset": "USDC",
            "toAsset": "ALGO",
            "amount": 10.0,
            "slippage": 0.01
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "route" in data
    assert data["route"]["expectedOutput"] > 0

def test_execute_trade(client, auth_token):
    # Get quote first
    quote_resp = client.post("/api/v1/trade/quote", ...)
    quote = quote_resp.json()
    
    # Execute trade
    trade_resp = client.post("/api/v1/trade/execute",
        headers=headers,
        json={
            "fromAsset": "USDC",
            "toAsset": "ALGO",
            "amount": 10.0,
            "route": quote["route"]
        }
    )
    assert trade_resp.status_code == 200
    assert "txId" in trade_resp.json()
```

---

### Task 4.3: Trade Command (CLI)
**Priority:** High
**Estimated Time:** 6 hours
**Dependencies:** Task 4.2

**Acceptance Criteria:**
- [ ] `algopay trade <amount> <from> <to>` command
- [ ] Show quote before execution
- [ ] Confirmation prompt with details
- [ ] Progress indicator
- [ ] Trade receipt display

**Test Strategy:**
```typescript
// Test: Trade CLI command
describe('Trade Command', () => {
  test('trades USDC for ALGO', async () => {
    const result = await runCLI([
      'trade', '10', 'usdc', 'algo'
    ]);
    expect(result.stdout).toContain('Trade completed');
    expect(result.stdout).toContain('Swapped:');
    expect(result.stdout).toContain('Received:');
  });

  test('shows quote before trading', async () => {
    const result = await runCLI([
      'trade', '10', 'usdc', 'algo', '--dry-run'
    ]);
    expect(result.stdout).toContain('Expected:');
    expect(result.stdout).toContain('Price Impact:');
  });
});
```

---

## Phase 5: x402 Protocol Integration (Week 5-6)

### Task 5.1: GoPlausible Bazaar Integration
**Priority:** Medium
**Estimated Time:** 6 hours
**Dependencies:** Task 3.3

**Acceptance Criteria:**
- [ ] Search x402 services in Bazaar
- [ ] Cache search results locally
- [ ] Service metadata parsing
- [ ] Rating and reputation display

**Test Strategy:**
```python
# Test: Bazaar integration
def test_search_bazaar(bazaar_client):
    results = bazaar_client.search("weather api")
    assert len(results) > 0
    assert results[0]["name"] is not None
    assert results[0]["price"] > 0

def test_get_service_details(bazaar_client):
    service = bazaar_client.get_service("https://weather.algo/api")
    assert service["provider"] is not None
    assert service["rating"] >= 0
```

**Reference Code:**
- https://github.com/goplausible
- x402 protocol specification

---

### Task 5.2: x402 Payment Flow (Backend)
**Priority:** Medium
**Estimated Time:** 8 hours
**Dependencies:** Task 5.1

**Acceptance Criteria:**
- [ ] GET /api/v1/x402/bazaar/search endpoint
- [ ] POST /api/v1/x402/pay endpoint
- [ ] Payment proof generation
- [ ] Access token management
- [ ] x402 facilitator integration

**Test Strategy:**
```python
# Test: x402 endpoints
def test_search_x402_services(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get("/api/v1/x402/bazaar/search?q=api",
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "services" in data
    assert len(data["services"]) > 0

def test_pay_for_service(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/api/v1/x402/pay",
        headers=headers,
        json={
            "serviceUrl": "https://weather.algo/api",
            "amount": 0.01
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "txId" in data
    assert "accessToken" in data
```

---

### Task 5.3: x402 Commands (CLI)
**Priority:** Medium
**Estimated Time:** 6 hours
**Dependencies:** Task 5.2

**Acceptance Criteria:**
- [ ] `algopay x402 bazaar search <query>` command
- [ ] `algopay x402 pay <url>` command
- [ ] Service listing with ratings
- [ ] Payment confirmation
- [ ] Access token display

**Test Strategy:**
```typescript
// Test: x402 CLI commands
describe('x402 Commands', () => {
  test('searches bazaar', async () => {
    const result = await runCLI([
      'x402', 'bazaar', 'search', 'weather'
    ]);
    expect(result.stdout).toContain('x402 Services');
    expect(result.stdout).toContain('Price:');
  });

  test('pays for service', async () => {
    const result = await runCLI([
      'x402', 'pay', 'https://weather.algo/api'
    ]);
    expect(result.stdout).toContain('Payment successful');
    expect(result.stdout).toContain('Access Token:');
  });
});
```

---

### Task 5.4: Monetization Feature
**Priority:** Low
**Estimated Time:** 10 hours
**Dependencies:** Task 5.2

**Acceptance Criteria:**
- [ ] POST /api/v1/x402/monetize endpoint
- [ ] Deploy ARC-58 plugin contract
- [ ] Configure x402 paywall
- [ ] Webhook setup for payments
- [ ] Revenue tracking

**Test Strategy:**
```python
# Test: Monetization
def test_monetize_endpoint(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post("/api/v1/x402/monetize",
        headers=headers,
        json={
            "endpoint": "https://myapi.com/data",
            "price": 0.05,
            "description": "Premium data API"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "paywallUrl" in data
    assert "pluginAddress" in data
```

---

## Phase 6: Guardrails & Security (Week 6-7)

### Task 6.1: Spending Limits Engine
**Priority:** Critical
**Estimated Time:** 6 hours
**Dependencies:** Task 3.3

**Acceptance Criteria:**
- [ ] Daily spending limit enforcement
- [ ] Per-transaction limit enforcement
- [ ] Limit storage in database
- [ ] Limit reset logic (daily)
- [ ] Custom limits per user

**Test Strategy:**
```python
# Test: Spending limits
def test_enforce_daily_limit(client, auth_token):
    # Send multiple transactions
    for i in range(10):
        response = client.post("/api/v1/wallet/send",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"to": "ADDR", "amount": 15.0}
        )
        if i < 6:  # Within 100 USDC daily limit
            assert response.status_code == 200
        else:  # Exceeds limit
            assert response.status_code == 400

def test_custom_spending_limit(client, auth_token):
    # Set custom limit
    client.post("/api/v1/wallet/limits",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"daily": 500.0}
    )
    
    # Should allow higher amount
    response = client.post("/api/v1/wallet/send",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"to": "ADDR", "amount": 200.0}
    )
    assert response.status_code == 200
```

---

### Task 6.2: KYT & Blocklist Integration
**Priority:** High
**Estimated Time:** 8 hours
**Dependencies:** Task 6.1

**Acceptance Criteria:**
- [ ] Blocklist database setup
- [ ] Check recipient against blocklist
- [ ] Transaction pattern analysis
- [ ] Risk scoring algorithm
- [ ] Alert system for suspicious activity

**Test Strategy:**
```python
# Test: KYT checks
def test_blocklisted_recipient_rejected(client, auth_token):
    response = client.post("/api/v1/wallet/send",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "to": "BLOCKLISTED_ADDRESS",
            "amount": 10.0
        }
    )
    assert response.status_code == 403
    assert "blocklisted" in response.json()["error"].lower()

def test_suspicious_pattern_flagged(client, auth_token):
    # Rapid transactions to multiple addresses
    for i in range(20):
        response = client.post("/api/v1/wallet/send",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"to": f"ADDR_{i}", "amount": 1.0}
        )
    
    # Should trigger rate limit or flag
    assert response.status_code in [429, 403]
```

---

### Task 6.3: Reputation System
**Priority:** Medium
**Estimated Time:** 6 hours
**Dependencies:** Task 6.2

**Acceptance Criteria:**
- [ ] Reputation score calculation (0-100)
- [ ] Score factors (age, volume, violations)
- [ ] Score-based limits adjustment
- [ ] Reputation display in status

**Test Strategy:**
```python
# Test: Reputation
def test_new_user_low_reputation(client, auth_token):
    response = client.get("/api/v1/wallet/status",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.json()
    assert data["reputation"] < 50  # New users start low

def test_reputation_increases_with_usage(client, auth_token):
    # Make successful transactions
    for i in range(10):
        client.post("/api/v1/wallet/send", ...)
    
    response = client.get("/api/v1/wallet/status",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.json()
    assert data["reputation"] > 50
```

---

## Phase 7: Monitoring & Advanced Features (Week 7-8)

### Task 7.1: Monitoring & Logging
**Priority:** High
**Estimated Time:** 6 hours
**Dependencies:** Task 1.3

**Acceptance Criteria:**
- [ ] Structured logging (JSON format)
- [ ] Log aggregation setup
- [ ] Metrics collection (Prometheus)
- [ ] Alerting rules configured
- [ ] Dashboard for ops team

**Test Strategy:**
```python
# Test: Logging
def test_transaction_logged(client, auth_token, caplog):
    client.post("/api/v1/wallet/send", ...)
    
    # Check logs
    assert any("transaction_sent" in record.message 
               for record in caplog.records)

def test_error_logged_with_context(client, caplog):
    client.post("/api/v1/wallet/send", 
        json={"invalid": "data"}
    )
    
    # Check error log has context
    error_logs = [r for r in caplog.records if r.levelname == "ERROR"]
    assert len(error_logs) > 0
    assert "userId" in error_logs[0].message
```

---

### Task 7.2: Companion Window (Local Web UI)
**Priority:** Medium
**Estimated Time:** 12 hours
**Dependencies:** Task 3.1

**Acceptance Criteria:**
- [ ] Embedded web server in CLI (Express/Fastify)
- [ ] Runs on localhost:3420
- [ ] Single-page app (React/Preact or vanilla JS)
- [ ] Shows wallet overview (balance, address)
- [ ] Transaction history table
- [ ] Real-time updates via WebSocket or polling
- [ ] Auto-opens browser on `algopay show`
- [ ] Graceful shutdown when CLI exits

**Test Strategy:**
```typescript
// Test: Companion window
describe('Show Command', () => {
  test('starts companion server', async () => {
    const result = await runCLI(['show']);
    expect(result.stdout).toContain('Opening wallet companion window');
    expect(result.stdout).toContain('http://localhost:3420');
    
    // Check server is running
    const response = await fetch('http://localhost:3420');
    expect(response.status).toBe(200);
  });

  test('companion window shows wallet data', async () => {
    await runCLI(['show']);
    
    // Visit the page
    const page = await browser.newPage();
    await page.goto('http://localhost:3420');
    
    // Check content
    expect(await page.textContent('h1')).toContain('Algopay Wallet');
    expect(await page.textContent('.balance')).toMatch(/\d+\.\d+ USDC/);
  });
});
```

**Implementation Notes:**
- Use lightweight framework (Express + static HTML/CSS/JS)
- Bundle UI assets into CLI package
- Session token passed via query param or localStorage
- Keep it simple - no complex build process
- Responsive design for mobile/desktop

---

### Task 7.3: Fund Command Enhancement
**Priority:** Medium
**Estimated Time:** 4 hours
**Dependencies:** Task 3.2

**Acceptance Criteria:**
- [ ] `algopay fund` command shows funding options
- [ ] QR code generation for wallet address
- [ ] Display multiple funding methods
- [ ] Copy address to clipboard functionality
- [ ] Minimum funding amount displayed

**Test Strategy:**
```typescript
// Test: Fund command
describe('Fund Command', () => {
  test('displays wallet address and QR code', async () => {
    const result = await runCLI(['fund']);
    expect(result.stdout).toContain('Fund Your Wallet');
    expect(result.stdout).toContain('Address:');
    expect(result.stdout).toContain('Scan QR Code:');
  });

  test('shows funding options', async () => {
    const result = await runCLI(['fund']);
    expect(result.stdout).toContain('Pera Wallet');
    expect(result.stdout).toContain('Circle');
  });
});
```

---

## Phase 8: Testing & Documentation (Week 8-9)

### Task 8.1: Integration Tests
**Priority:** Critical
**Estimated Time:** 12 hours
**Dependencies:** All previous tasks

**Acceptance Criteria:**
- [ ] End-to-end auth flow test
- [ ] Complete send transaction test
- [ ] Complete trade flow test
- [ ] x402 payment flow test
- [ ] All tests run on testnet

**Test Strategy:**
```typescript
// Test: E2E flows
describe('E2E: Complete User Journey', () => {
  test('user can sign up and send USDC', async () => {
    // 1. Login
    await runCLI(['auth', 'login', 'test@example.com']);
    
    // 2. Verify (mock OTP)
    await runCLI(['auth', 'verify', 'flow123', '123456']);
    
    // 3. Check balance
    const balance = await runCLI(['balance', '--json']);
    expect(JSON.parse(balance.stdout).usdc).toBeGreaterThan(0);
    
    // 4. Send transaction
    const send = await runCLI(['send', '1', 'RECIPIENT']);
    expect(send.stdout).toContain('Transaction confirmed');
  });
});
```

---

### Task 8.2: Documentation
**Priority:** High
**Estimated Time:** 8 hours
**Dependencies:** Task 8.1

**Acceptance Criteria:**
- [ ] README with quickstart
- [ ] API documentation (OpenAPI)
- [ ] CLI command reference
- [ ] Architecture diagrams
- [ ] Deployment guide
- [ ] Troubleshooting guide

**Deliverables:**
- docs/README.md
- docs/API.md
- docs/CLI.md
- docs/DEPLOYMENT.md
- docs/ARCHITECTURE.md

---

### Task 8.3: Security Audit Preparation
**Priority:** High
**Estimated Time:** 6 hours
**Dependencies:** Task 8.1

**Acceptance Criteria:**
- [ ] Security checklist completed
- [ ] Dependency vulnerability scan
- [ ] Code security review
- [ ] Penetration testing plan
- [ ] Incident response plan

---

## Phase 9: Deployment & Launch (Week 9-10)

### Task 9.1: Testnet Deployment
**Priority:** Critical
**Estimated Time:** 8 hours
**Dependencies:** Task 8.3

**Acceptance Criteria:**
- [ ] Backend deployed to Render/Railway
- [ ] Intermezzo deployed in Docker
- [ ] Database provisioned
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Monitoring active

---

### Task 9.2: CLI Package Publishing
**Priority:** Critical
**Estimated Time:** 4 hours
**Dependencies:** Task 9.1

**Acceptance Criteria:**
- [ ] Package published to npm
- [ ] `npx algopay` works globally
- [ ] Version tagging setup
- [ ] Changelog maintained
- [ ] Release notes published

---

### Task 9.3: Mainnet Deployment
**Priority:** Critical
**Estimated Time:** 6 hours
**Dependencies:** Task 9.2

**Acceptance Criteria:**
- [ ] Production environment setup
- [ ] Mainnet configuration
- [ ] Fee pool wallet funded
- [ ] Monitoring and alerts active
- [ ] Backup and recovery tested
- [ ] Rollback plan documented

---

## Summary

**Total Estimated Time:** 8-10 weeks
**Critical Path:** Tasks 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 3.1 → 3.3 → 3.4 → 9.1 → 9.2 → 9.3

**Key Milestones:**
- Week 2: Authentication working
- Week 4: Send transactions working
- Week 5: Trading working
- Week 6: x402 integration complete
- Week 8: All tests passing
- Week 10: Production launch

**Risk Mitigation:**
- Start with Intermezzo integration early (highest risk)
- Test on testnet throughout development
- Have fallback plans for external dependencies
- Regular security reviews
- Continuous integration testing
