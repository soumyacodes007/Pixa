# Algopay Design Document

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent / User                          │
└────────────────────┬────────────────────────────────────────┘
                     │ CLI Commands / MCP Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Algopay CLI (npx algopay)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Command Parser & Validator                          │   │
│  │  - Auth commands (login, verify, logout)             │   │
│  │  - Wallet commands (status, balance, address, send)  │   │
│  │  - Trading commands (trade, swap)                    │   │
│  │  - x402 commands (search, pay, monetize)             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST + MCP Protocol
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP Runtime Layer (Production)                  │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │  algorand-mcp SERVER   │  │ algorand-remote-mcp-lite │   │
│  │  (125+ tools)          │  │ (Wallet Edition)         │   │
│  │  - Account management  │  │ - OAuth/OIDC auth        │   │
│  │  - Asset operations    │  │ - Transaction signing    │   │
│  │  - Smart contracts     │  │ - Session management     │   │
│  └────────────────────────┘  └──────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (FastAPI - Python)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth Middleware                                     │   │
│  │  - Email OTP validation                              │   │
│  │  - OAuth flow management                             │   │
│  │  - Session token management                          │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Guardrails Engine                                   │   │
│  │  - Spending limits enforcement                       │   │
│  │  - Reputation scoring                                │   │
│  │  - KYT (Know Your Transaction) checks                │   │
│  │  - Blocklist validation                              │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Transaction Builder (AlgoKit)                       │   │
│  │  - Atomic group construction                         │   │
│  │  - Fee pooling logic                                 │   │
│  │  - Transaction validation                            │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Signing Service Client                              │   │
│  │  - Intermezzo API integration                        │   │
│  │  - Unsigned tx preparation                           │   │
│  │  - Signed tx handling                                │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ REST Calls to Intermezzo
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Intermezzo (Algorand Foundation Custodial API)       │
│              Running on HashiCorp Vault                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Key Management                                      │   │
│  │  - Vault-backed key storage                          │   │
│  │  - TEE-like security enclave                         │   │
│  │  - Key never leaves Vault                            │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Transaction Signing                                 │   │
│  │  - Sign with stored keys                             │   │
│  │  - Audit logging                                     │   │
│  │  - Rate limiting                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Signed Transactions
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            ARC-58 Smart Wallet (On-Chain)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Fee Pooling via Atomic Groups                       │   │
│  │  - Backend wallet pays ALL fees                      │   │
│  │  - User wallet gasless                               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Protocol Support                                    │   │
│  │  - x402 payment protocol                             │   │
│  │  - AP2 (Agentic Payment Protocol v2)                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Plugins                                             │   │
│  │  - Revenue split logic                               │   │
│  │  - Escrow functionality                              │   │
│  │  - Dynamic spending limits                           │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Vestige MCP Integration                             │   │
│  │  - Price feed queries                                │   │
│  │  - Smart swap routing                                │   │
│  │  - DEX aggregation                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Blockchain Transactions
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Algorand Mainnet / Testnet                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Ecosystem Services                              │
│  - x402 Bazaar (GoPlausible)                                 │
│  - AP2 Endpoints                                             │
│  - Vestige DEX Aggregator                                    │
│  - Algorand Indexer                                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

#### CLI Layer
- Command parsing and validation
- User input/output formatting
- Configuration management (network, endpoints)
- Local session storage
- JSON output support
- Error presentation
- QR code generation for addresses

#### MCP Runtime Layer
- Protocol translation (CLI ↔ Backend)
- Tool discovery and invocation
- OAuth/OIDC flow coordination
- Session token management
- Request/response serialization

#### Backend Layer
- Business logic orchestration
- Authentication and authorization
- Guardrails enforcement
- Transaction construction
- Fee pooling coordination
- API rate limiting
- Logging and monitoring

#### Intermezzo Layer
- Cryptographic key storage
- Transaction signing
- Audit trail
- Security policy enforcement

#### Smart Wallet Layer
- On-chain state management
- Fee pooling execution
- Protocol compliance (x402, AP2)
- Plugin execution

## 2. Data Models

### 2.1 User Session
```typescript
interface UserSession {
  flowId: string;           // OAuth flow identifier
  email: string;            // User email
  walletAddress: string;    // ARC-58 smart wallet address
  sessionToken: string;     // JWT or similar
  expiresAt: number;        // Unix timestamp
  network: 'mainnet' | 'testnet';
}
```

### 2.2 Wallet State
```typescript
interface WalletState {
  address: string;          // Smart wallet address
  balance: {
    algo: number;           // Native ALGO balance
    usdc: number;           // USDC balance
    assets: Asset[];        // Other ASA balances
  };
  spendingLimits: {
    daily: number;          // Daily limit in USDC
    perTransaction: number; // Per-tx limit in USDC
    remaining: number;      // Remaining today
  };
  reputation: number;       // 0-100 score
  status: 'active' | 'frozen' | 'suspended';
}

interface Asset {
  assetId: number;
  name: string;
  unitName: string;
  amount: number;
  decimals: number;
}
```

### 2.3 Transaction Request
```typescript
interface TransactionRequest {
  type: 'send' | 'trade' | 'x402_pay';
  from: string;             // Sender address
  to?: string;              // Recipient (for send)
  amount: number;           // Amount in base units
  asset?: number;           // Asset ID (default: USDC)
  memo?: string;            // Optional memo
  feePooling: boolean;      // Enable fee pooling
  metadata?: Record<string, any>;
}
```

### 2.4 Trade Request
```typescript
interface TradeRequest {
  fromAsset: number;        // Source asset ID
  toAsset: number;          // Destination asset ID
  amount: number;           // Amount to trade
  slippage: number;         // Max slippage (0.01 = 1%)
  route?: SwapRoute;        // Optional specific route
}

interface SwapRoute {
  dex: string;              // 'tinyman' | 'humble' | 'vestige'
  pools: string[];          // Pool addresses
  expectedOutput: number;   // Expected output amount
  priceImpact: number;      // Price impact percentage
}
```

### 2.5 x402 Service
```typescript
interface X402Service {
  url: string;              // Service endpoint
  name: string;             // Service name
  description: string;      // Service description
  price: number;            // Price in USDC
  provider: string;         // Provider address
  metadata: {
    category: string;
    rating: number;
    usageCount: number;
  };
}
```

## 3. API Specifications

### 3.1 Backend REST API

#### Authentication Endpoints

**POST /api/v1/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "network": "testnet"
}

Response:
{
  "flowId": "flow_abc123",
  "expiresIn": 300
}
```

**POST /api/v1/auth/verify**
```json
Request:
{
  "flowId": "flow_abc123",
  "otp": "123456"
}

Response:
{
  "sessionToken": "jwt_token_here",
  "walletAddress": "WALLET_ADDRESS_HERE",
  "expiresAt": 1234567890
}
```

**POST /api/v1/auth/logout**
```json
Request:
{
  "sessionToken": "jwt_token_here"
}

Response:
{
  "success": true
}
```

#### Wallet Endpoints

**GET /api/v1/wallet/status**
```json
Headers:
  Authorization: Bearer <sessionToken>

Response:
{
  "address": "WALLET_ADDRESS",
  "balance": {
    "algo": 1000000,
    "usdc": 50000000
  },
  "spendingLimits": {
    "daily": 100000000,
    "perTransaction": 10000000,
    "remaining": 75000000
  },
  "status": "active"
}
```

**GET /api/v1/wallet/balance**
```json
Headers:
  Authorization: Bearer <sessionToken>

Response:
{
  "algo": 1.5,
  "usdc": 50.00,
  "assets": [
    {
      "assetId": 31566704,
      "name": "USDC",
      "amount": 50.00,
      "decimals": 6
    }
  ]
}
```

**POST /api/v1/wallet/send**
```json
Request:
{
  "to": "RECIPIENT_ADDRESS",
  "amount": 10.00,
  "asset": "USDC",
  "memo": "Payment for service"
}

Response:
{
  "txId": "TX_ID_HERE",
  "status": "pending",
  "amount": 10.00,
  "fee": 0.001,
  "feePooled": true
}
```

#### Trading Endpoints

**POST /api/v1/trade/quote**
```json
Request:
{
  "fromAsset": "USDC",
  "toAsset": "ALGO",
  "amount": 10.00,
  "slippage": 0.01
}

Response:
{
  "route": {
    "dex": "vestige",
    "expectedOutput": 15.234,
    "priceImpact": 0.002,
    "fee": 0.003
  },
  "expiresAt": 1234567890
}
```

**POST /api/v1/trade/execute**
```json
Request:
{
  "fromAsset": "USDC",
  "toAsset": "ALGO",
  "amount": 10.00,
  "route": { /* route from quote */ }
}

Response:
{
  "txId": "TX_ID_HERE",
  "status": "pending",
  "actualOutput": 15.230
}
```

#### x402 Endpoints

**GET /api/v1/x402/bazaar/search**
```json
Query Params:
  q=api&category=data&limit=10

Response:
{
  "services": [
    {
      "url": "https://example.com/api",
      "name": "Weather API",
      "price": 0.01,
      "provider": "PROVIDER_ADDRESS",
      "rating": 4.5
    }
  ],
  "total": 42
}
```

**POST /api/v1/x402/pay**
```json
Request:
{
  "serviceUrl": "https://example.com/api",
  "amount": 0.01
}

Response:
{
  "txId": "TX_ID_HERE",
  "paymentProof": "PROOF_TOKEN",
  "accessToken": "ACCESS_TOKEN_FOR_SERVICE"
}
```

**POST /api/v1/x402/monetize**
```json
Request:
{
  "endpoint": "https://myapi.com/data",
  "price": 0.05,
  "description": "Premium data API"
}

Response:
{
  "paywallUrl": "https://x402.goplausible.com/paywall/abc123",
  "webhookUrl": "https://backend.algopay.com/webhook/abc123",
  "pluginAddress": "PLUGIN_CONTRACT_ADDRESS"
}
```

### 3.2 Intermezzo API Integration

**POST /sign**
```json
Request:
{
  "wallet": "WALLET_ADDRESS",
  "transaction": "BASE64_ENCODED_UNSIGNED_TX",
  "context": {
    "requestId": "req_123",
    "userId": "user_456"
  }
}

Response:
{
  "signedTransaction": "BASE64_ENCODED_SIGNED_TX",
  "txId": "TX_ID_HERE"
}
```

## 4. Security Design

### 4.1 Key Management
- Private keys NEVER leave Intermezzo/Vault
- Backend only handles unsigned transactions
- CLI never sees private keys
- Session tokens are short-lived (1 hour default)

### 4.2 Guardrails
```python
class GuardrailEngine:
    def validate_transaction(self, tx: Transaction, user: User) -> ValidationResult:
        checks = [
            self.check_spending_limit(tx, user),
            self.check_reputation(user),
            self.check_blocklist(tx.recipient),
            self.check_kyt(tx),
            self.check_rate_limit(user)
        ]
        return all(checks)
```

### 4.3 Authentication Flow
1. User requests login with email
2. Backend generates flowId, sends OTP via GoPlausible
3. User submits OTP
4. Backend validates OTP, creates session
5. Intermezzo creates/attaches wallet
6. Session token returned to CLI
7. All subsequent requests use session token

### 4.4 Fee Pooling Security
- Backend wallet is separate from user wallets
- Backend wallet only pays fees, never receives funds
- Atomic groups ensure atomicity (all or nothing)
- Backend wallet balance monitored and alerted

## 5. Error Handling

### 5.1 Error Categories
```typescript
enum ErrorCode {
  // Auth errors (1xxx)
  AUTH_INVALID_EMAIL = 1001,
  AUTH_INVALID_OTP = 1002,
  AUTH_SESSION_EXPIRED = 1003,
  AUTH_UNAUTHORIZED = 1004,
  
  // Wallet errors (2xxx)
  WALLET_INSUFFICIENT_BALANCE = 2001,
  WALLET_INVALID_ADDRESS = 2002,
  WALLET_NOT_FOUND = 2003,
  
  // Transaction errors (3xxx)
  TX_SPENDING_LIMIT_EXCEEDED = 3001,
  TX_BLOCKLISTED_RECIPIENT = 3002,
  TX_FAILED_KYT = 3003,
  TX_INVALID_AMOUNT = 3004,
  
  // Trading errors (4xxx)
  TRADE_SLIPPAGE_EXCEEDED = 4001,
  TRADE_INSUFFICIENT_LIQUIDITY = 4002,
  TRADE_ROUTE_NOT_FOUND = 4003,
  
  // x402 errors (5xxx)
  X402_SERVICE_NOT_FOUND = 5001,
  X402_PAYMENT_FAILED = 5002,
  X402_INVALID_PROOF = 5003,
  
  // System errors (9xxx)
  SYSTEM_INTERMEZZO_UNAVAILABLE = 9001,
  SYSTEM_NETWORK_ERROR = 9002,
  SYSTEM_RATE_LIMIT = 9003
}
```

### 5.2 Retry Logic
- Network errors: 3 retries with exponential backoff
- Intermezzo unavailable: 5 retries, then fail gracefully
- Transaction pending: Poll for 30 seconds, then return txId
- Rate limits: Return clear error with retry-after header

## 6. Configuration

### 6.1 CLI Configuration
```json
{
  "network": "testnet",
  "apiEndpoint": "https://api.algopay.com",
  "mcpEndpoint": "https://mcp.algopay.com",
  "sessionFile": "~/.algopay/session.json",
  "timeout": 30000,
  "retries": 3
}
```

### 6.2 Backend Configuration
```python
class Config:
    # Network
    ALGORAND_NODE = os.getenv("ALGORAND_NODE")
    ALGORAND_INDEXER = os.getenv("ALGORAND_INDEXER")
    NETWORK = os.getenv("NETWORK", "testnet")
    
    # Intermezzo
    INTERMEZZO_URL = os.getenv("INTERMEZZO_URL")
    INTERMEZZO_API_KEY = os.getenv("INTERMEZZO_API_KEY")
    
    # Auth
    GOPLAUSIBLE_OAUTH_CLIENT_ID = os.getenv("GOPLAUSIBLE_OAUTH_CLIENT_ID")
    GOPLAUSIBLE_OAUTH_SECRET = os.getenv("GOPLAUSIBLE_OAUTH_SECRET")
    SESSION_SECRET = os.getenv("SESSION_SECRET")
    SESSION_EXPIRY = 3600  # 1 hour
    
    # Guardrails
    DEFAULT_DAILY_LIMIT = 100_000_000  # 100 USDC
    DEFAULT_TX_LIMIT = 10_000_000      # 10 USDC
    MIN_REPUTATION = 50
    
    # Fee Pooling
    FEE_POOL_WALLET = os.getenv("FEE_POOL_WALLET")
    FEE_POOL_MIN_BALANCE = 10_000_000  # 10 ALGO
```

## 7. Deployment Architecture

### 7.1 Components
- **CLI**: npm package, distributed via npmjs.com
- **Backend**: FastAPI app, deployed on Render/Railway/AWS
- **Intermezzo**: Docker container, self-hosted
- **Companion Window**: Local web UI (embedded in CLI, runs on localhost:3420)
- **Database**: PostgreSQL for sessions, limits, audit logs

### 7.2 Infrastructure
```yaml
# docker-compose.yml
services:
  backend:
    image: algopay/backend:latest
    environment:
      - ALGORAND_NODE=https://testnet-api.algonode.cloud
      - INTERMEZZO_URL=http://intermezzo:8080
    depends_on:
      - postgres
      - intermezzo
  
  intermezzo:
    image: algorandfoundation/intermezzo:latest
    environment:
      - VAULT_ADDR=http://vault:8200
    depends_on:
      - vault
  
  vault:
    image: hashicorp/vault:latest
    cap_add:
      - IPC_LOCK
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=algopay
```

## 8. Monitoring & Observability

### 8.1 Metrics
- Transaction success rate
- Average transaction time
- Fee pool balance
- API response times
- Error rates by category
- Active sessions count
- Spending limit utilization

### 8.2 Logging
```python
# Structured logging format
{
  "timestamp": "2026-02-26T10:30:00Z",
  "level": "INFO",
  "service": "backend",
  "event": "transaction_sent",
  "userId": "user_123",
  "txId": "TX_ID",
  "amount": 10.00,
  "asset": "USDC",
  "feePooled": true,
  "duration_ms": 234
}
```

### 8.3 Alerts
- Fee pool balance < threshold
- Intermezzo unavailable > 1 minute
- Error rate > 5%
- Spending limit breaches
- Suspicious transaction patterns

## 9. Testing Strategy

### 9.1 Unit Tests
- CLI command parsing
- Backend business logic
- Guardrail validation
- Transaction construction

### 9.2 Integration Tests
- Auth flow (login → verify → session)
- Send transaction (CLI → Backend → Intermezzo → Blockchain)
- Trade execution (quote → execute → confirm)
- x402 payment flow

### 9.3 E2E Tests
- Complete user journey on testnet
- Fee pooling verification
- Error handling scenarios
- Rate limiting behavior

## 10. Migration from AWAL

### 10.1 Command Mapping
All AWAL commands have direct Algopay equivalents:
- `npx awal` → `npx algopay`
- Same command structure
- Same output format (with `--json` flag)
- Additional `--network` flag for testnet/mainnet

### 10.2 Key Differences
- Faster finality (3.3s vs ~2min)
- Lower fees (native fee pooling)
- Dual protocol support (x402 + AP2)
- Native USDC on Algorand
- Self-hostable infrastructure
