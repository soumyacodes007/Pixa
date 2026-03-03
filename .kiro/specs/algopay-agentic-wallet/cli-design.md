# Algopay CLI Design Specification

## 1. CLI Output Design Philosophy

The CLI should be:
- **Clean**: Minimal visual noise, clear hierarchy
- **Informative**: Show what matters, hide what doesn't
- **Consistent**: Same patterns across all commands
- **Beautiful**: Use colors, icons, and formatting thoughtfully
- **Machine-readable**: Support `--json` flag for all commands

## 2. Visual Design System

### 2.1 Icons & Symbols
```
✓ - Success (green)
✗ - Error (red)
ℹ - Info (blue)
⚠ - Warning (yellow)
→ - Action/Next step (cyan)
• - List item (gray)
```

### 2.2 Color Palette
```typescript
const colors = {
  success: '#00D26A',    // Green
  error: '#FF4757',      // Red
  warning: '#FFA502',    // Yellow
  info: '#1E90FF',       // Blue
  primary: '#5F27CD',    // Purple
  muted: '#747D8C',      // Gray
  highlight: '#00D2D3',  // Cyan
};
```

### 2.3 Typography
```
Headers: Bold, larger
Labels: Regular, muted color
Values: Bold, primary color
Commands: Monospace, highlighted
```

## 3. Command Output Specifications

### 3.1 `npx algopay status`

**Success State (Authenticated):**
```
Algopay Wallet
✓ Running (PID: 61234)

Authentication
✓ Authenticated
Logged in as: user@example.com
Network: testnet

Wallet
Address: XYZABC...DEFGH
Balance: 50.00 USDC
```

**Success State (Not Authenticated):**
```
Algopay Wallet
✓ Running (PID: 61234)

Authentication
✗ Not authenticated

To get started, run:
  algopay auth login user@example.com
```

**JSON Output:**
```json
{
  "status": "running",
  "pid": 61234,
  "authenticated": true,
  "user": {
    "email": "user@example.com",
    "walletAddress": "XYZABC...DEFGH"
  },
  "network": "testnet",
  "balance": {
    "usdc": 50.00
  }
}
```

### 3.2 `npx algopay auth login <email>`

**Success:**
```
✓ Verification code sent!
ℹ Check your email (user@example.com) for a 6-digit code.

Flow ID: 8beba1c2-5674-4f24-a0fa-...

To complete sign-in, run:
  algopay auth verify 8beba1c2-5674-4f24-a0fa-... <6-digit-code>
```

**Error (Invalid Email):**
```
✗ Authentication failed
Invalid email address format

Please provide a valid email:
  algopay auth login user@example.com
```

**JSON Output:**
```json
{
  "success": true,
  "flowId": "8beba1c2-5674-4f24-a0fa-...",
  "email": "user@example.com",
  "expiresIn": 300
}
```

### 3.3 `npx algopay auth verify <flowId> <otp>`

**Success:**
```
✓ Authentication successful!
Successfully signed in as user@example.com

Wallet Address: XYZABC...DEFGH
Network: testnet

You can now use wallet commands:
  algopay balance
  algopay address
  algopay send
```

**Error (Invalid OTP):**
```
✗ Verification failed
Invalid or expired verification code

Please try again:
  algopay auth verify 8beba1c2-5674-4f24-a0fa-... <6-digit-code>

Or request a new code:
  algopay auth login user@example.com
```

**JSON Output:**
```json
{
  "success": true,
  "email": "user@example.com",
  "walletAddress": "XYZABC...DEFGH",
  "network": "testnet",
  "sessionToken": "jwt_token_here"
}
```

### 3.4 `npx algopay balance`

**Success:**
```
Wallet Balance

ALGO    1.5000
USDC    50.0000

Total Value: ~$51.50 USD
```

**With Assets:**
```
Wallet Balance

ALGO    1.5000
USDC    50.0000
GOBTC   0.0012
GOETH   0.0345

Total Value: ~$125.75 USD
```

**JSON Output:**
```json
{
  "address": "XYZABC...DEFGH",
  "balances": [
    {
      "asset": "ALGO",
      "amount": 1.5000,
      "valueUsd": 1.50
    },
    {
      "asset": "USDC",
      "amount": 50.0000,
      "valueUsd": 50.00
    }
  ],
  "totalValueUsd": 51.50
}
```

### 3.5 `npx algopay address`

**Success:**
```
Wallet Address

XYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD

Network: testnet

View on AlgoExplorer:
https://testnet.algoexplorer.io/address/XYZABC...
```

**JSON Output:**
```json
{
  "address": "XYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
  "network": "testnet",
  "explorerUrl": "https://testnet.algoexplorer.io/address/XYZABC..."
}
```

### 3.6 `npx algopay send <amount> <recipient>`

**Processing:**
```
Sending USDC...

From:     XYZABC...DEFGH
To:       ABCDEF...XYZGH
Amount:   10.00 USDC
Fee:      0.001 ALGO (pooled)

⏳ Waiting for confirmation...
```

**Success:**
```
✓ Transaction confirmed!

Transaction ID: TXID123...ABC
Amount: 10.00 USDC
Fee: 0.001 ALGO (pooled by Algopay)

View on AlgoExplorer:
https://testnet.algoexplorer.io/tx/TXID123...ABC
```

**Error (Insufficient Balance):**
```
✗ Transaction failed
Insufficient balance

Available: 5.00 USDC
Required:  10.00 USDC

Please fund your wallet:
  algopay fund
```

**JSON Output:**
```json
{
  "success": true,
  "txId": "TXID123...ABC",
  "from": "XYZABC...DEFGH",
  "to": "ABCDEF...XYZGH",
  "amount": 10.00,
  "asset": "USDC",
  "fee": 0.001,
  "feePooled": true,
  "confirmedRound": 12345678,
  "explorerUrl": "https://testnet.algoexplorer.io/tx/TXID123...ABC"
}
```

### 3.7 `npx algopay trade <amount> <from> <to>`

**Getting Quote:**
```
Finding best route...

From:     10.00 USDC
To:       ~15.234 ALGO
Route:    Vestige → Tinyman
Price:    1 USDC = 1.523 ALGO
Impact:   0.2%
Fee:      0.003 ALGO (pooled)

⏳ Executing trade...
```

**Success:**
```
✓ Trade completed!

Swapped:  10.00 USDC
Received: 15.230 ALGO
Rate:     1 USDC = 1.523 ALGO

Transaction ID: TXID456...DEF

View on AlgoExplorer:
https://testnet.algoexplorer.io/tx/TXID456...DEF
```

**Error (Slippage Exceeded):**
```
✗ Trade failed
Slippage exceeded maximum tolerance

Expected: 15.234 ALGO
Actual:   14.890 ALGO
Slippage: 2.3% (max: 1.0%)

Please try again or increase slippage tolerance:
  algopay trade 10 usdc algo --slippage 3
```

**JSON Output:**
```json
{
  "success": true,
  "txId": "TXID456...DEF",
  "fromAsset": "USDC",
  "toAsset": "ALGO",
  "amountIn": 10.00,
  "amountOut": 15.230,
  "rate": 1.523,
  "route": {
    "dex": "vestige",
    "pools": ["POOL1", "POOL2"],
    "priceImpact": 0.002
  },
  "fee": 0.003,
  "feePooled": true
}
```

### 3.8 `npx algopay x402 bazaar search <query>`

**Success:**
```
x402 Services

Weather API
  Price: 0.01 USDC per request
  Provider: weather.algo
  Rating: ★★★★☆ (4.5)
  
Data Analytics API
  Price: 0.05 USDC per request
  Provider: analytics.algo
  Rating: ★★★★★ (5.0)

AI Image Generation
  Price: 0.10 USDC per request
  Provider: ai-images.algo
  Rating: ★★★★☆ (4.2)

Found 3 services matching "api"

To pay for a service:
  algopay x402 pay <service-url>
```

**JSON Output:**
```json
{
  "query": "api",
  "services": [
    {
      "name": "Weather API",
      "url": "https://weather.algo/api",
      "price": 0.01,
      "provider": "weather.algo",
      "rating": 4.5,
      "category": "data"
    }
  ],
  "total": 3
}
```

### 3.9 `npx algopay x402 pay <url>`

**Processing:**
```
Paying for service...

Service:  Weather API
URL:      https://weather.algo/api
Price:    0.01 USDC

⏳ Processing payment...
```

**Success:**
```
✓ Payment successful!

Transaction ID: TXID789...GHI
Amount: 0.01 USDC

Access Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Use this token to access the service:
curl -H "Authorization: Bearer <token>" https://weather.algo/api
```

**JSON Output:**
```json
{
  "success": true,
  "txId": "TXID789...GHI",
  "serviceUrl": "https://weather.algo/api",
  "amount": 0.01,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1234567890
}
```

### 3.10 `npx algopay fund`

**Success:**
```
Fund Your Wallet

Address: XYZABC...DEFGH
Network: testnet

Options:

1. Pera Wallet Fund
   → Opens Pera Fund interface
   
2. Circle USDC Onramp
   → Buy USDC with credit card
   
3. Direct Transfer
   → Send USDC to your wallet address

Choose an option (1-3):
```

### 3.11 `npx algopay monetize <endpoint>`

**Processing:**
```
Setting up x402 paywall...

Endpoint:     https://myapi.com/data
Price:        0.05 USDC per request
Description:  Premium data API

⏳ Deploying smart contract...
```

**Success:**
```
✓ Paywall deployed!

Your API is now monetized with x402

Paywall URL:
https://x402.goplausible.com/paywall/abc123

Webhook URL:
https://backend.algopay.com/webhook/abc123

Plugin Contract:
PLUGIN_CONTRACT_ADDRESS

Share your paywall URL with customers!
```

**JSON Output:**
```json
{
  "success": true,
  "endpoint": "https://myapi.com/data",
  "price": 0.05,
  "paywallUrl": "https://x402.goplausible.com/paywall/abc123",
  "webhookUrl": "https://backend.algopay.com/webhook/abc123",
  "pluginAddress": "PLUGIN_CONTRACT_ADDRESS"
}
```

### 3.12 `npx algopay show`

**Success:**
```
✓ Opening wallet companion window...

Companion Window:
http://localhost:3420

Your browser should open automatically.
If not, visit the URL above.
```

**JSON Output:**
```json
{
  "success": true,
  "url": "http://localhost:3420",
  "pid": 12345
}
```

---

### 3.13 `npx algopay fund`

**Success:**
```
Fund Your Wallet

Address: XYZABC...DEFGH
Network: testnet

Scan QR Code:
█████████████████
█████████████████
█████████████████

Or send USDC directly to:
XYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD

Funding Options:
• Pera Wallet: Transfer from your Pera Wallet
• Circle: Buy USDC with credit card
• Exchange: Withdraw from exchange to address above

Minimum: 1 USDC
```

## 4. Global Flags

All commands support these flags:

```bash
--json              # Output in JSON format
--network testnet   # Use testnet (default: mainnet)
--network mainnet   # Use mainnet
--help              # Show command help
--version           # Show CLI version
--verbose           # Show detailed logs
--quiet             # Suppress non-essential output
```

## 5. Error Handling Patterns

### 5.1 Network Errors
```
✗ Network error
Unable to connect to Algopay backend

Please check your internet connection and try again.

If the problem persists, check status:
https://status.algopay.com
```

### 5.2 Authentication Errors
```
✗ Authentication required

Please sign in first:
  algopay auth login user@example.com
```

### 5.3 Rate Limit Errors
```
✗ Rate limit exceeded

Too many requests. Please wait 60 seconds and try again.

Retry after: 2026-02-26T10:31:00Z
```

### 5.4 Validation Errors
```
✗ Invalid input

Amount must be a positive number
Received: -10

Example:
  algopay send 10 RECIPIENT_ADDRESS
```

## 6. Progress Indicators

### 6.1 Spinner (for quick operations)
```
⏳ Processing...
```

### 6.2 Progress Bar (for longer operations)
```
Deploying contract... ████████████░░░░░░░░ 60%
```

### 6.3 Step Indicator (for multi-step operations)
```
[1/3] Building transaction...
[2/3] Signing with Intermezzo...
[3/3] Broadcasting to network...
```

## 7. Interactive Prompts

### 7.1 Confirmation Prompts
```
You are about to send 100.00 USDC to RECIPIENT_ADDRESS

This action cannot be undone.

Continue? (y/N):
```

### 7.2 Selection Prompts
```
Choose a network:
  1. Testnet (recommended for testing)
  2. Mainnet (real transactions)

Enter your choice (1-2):
```

### 7.3 Input Prompts
```
Enter recipient address:
> _
```

## 8. Help Text

### 8.1 `npx algopay --help`
```
Algopay - Agentic Payment Wallet for Algorand

Usage:
  algopay <command> [options]

Commands:
  status                    Check wallet status
  auth login <email>        Sign in with email
  auth verify <flow> <otp>  Verify OTP code
  balance                   Show wallet balance
  address                   Show wallet address
  show                      Open wallet companion window
  send <amount> <to>        Send USDC
  trade <amount> <from> <to> Trade tokens
  fund                      Fund your wallet
  x402 bazaar search <q>    Search x402 services
  x402 pay <url>            Pay for x402 service
  monetize <endpoint>       Monetize your API

Global Options:
  --json                    Output in JSON format
  --network <net>           Use testnet or mainnet
  --help                    Show help
  --version                 Show version

Examples:
  algopay auth login user@example.com
  algopay send 10 RECIPIENT_ADDRESS
  algopay trade 5 usdc algo
  algopay x402 bazaar search "weather api"

Documentation:
  https://docs.algopay.com

Support:
  https://github.com/algopay/algopay/issues
```

## 9. Implementation Notes

### 9.1 CLI Framework
Use **Commander.js** for command parsing and **Chalk** for colors:

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('algopay')
  .description('Agentic Payment Wallet for Algorand')
  .version('1.0.0');

// Example command
program
  .command('status')
  .description('Check wallet status')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    if (options.json) {
      console.log(JSON.stringify(await getStatus(), null, 2));
    } else {
      const spinner = ora('Checking status...').start();
      const status = await getStatus();
      spinner.stop();
      
      console.log(chalk.bold('\nAlgopay Wallet'));
      console.log(chalk.green('✓') + ' Running');
      // ... rest of output
    }
  });
```

### 9.2 Output Formatting
```typescript
// Helper functions for consistent formatting
const formatSuccess = (message: string) => chalk.green('✓') + ' ' + message;
const formatError = (message: string) => chalk.red('✗') + ' ' + message;
const formatInfo = (message: string) => chalk.blue('ℹ') + ' ' + message;
const formatWarning = (message: string) => chalk.yellow('⚠') + ' ' + message;

const formatAddress = (addr: string) => {
  return addr.slice(0, 6) + '...' + addr.slice(-6);
};

const formatAmount = (amount: number, decimals: number = 4) => {
  return amount.toFixed(decimals);
};
```

### 9.3 Configuration Storage
```typescript
// Store session in ~/.algopay/session.json
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const CONFIG_DIR = path.join(os.homedir(), '.algopay');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

async function saveSession(session: Session) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2));
}

async function loadSession(): Promise<Session | null> {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}
```

## 10. Accessibility

- Use clear, descriptive messages
- Provide alternative text for icons in screen readers
- Support keyboard-only navigation in interactive prompts
- Ensure color is not the only way to convey information
- Provide `--quiet` mode for automation/scripting
