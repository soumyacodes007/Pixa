# MoonPay CLI Commands - Complete Reference

Based on the inspiration folder, here are all the MoonPay CLI commands we can learn from:

## 🔐 Authentication & Setup

```bash
# Install
npm i -g @moonpay/cli

# Login (sends OTP to email)
mp login --email user@example.com

# Verify OTP
mp verify --email user@example.com --code 123456

# Check current user
mp user retrieve

# Logout
mp logout
```

## 💼 Wallet Management (Local, Encrypted)

```bash
# Create new HD wallet (Solana, Ethereum, Bitcoin, Tron)
mp wallet create --name "my-wallet"

# Import from mnemonic
mp wallet import --name "restored" --mnemonic "word1 word2 ..."

# Import from private key
mp wallet import --name "imported" --key <hex-key> --chain ethereum

# List all wallets
mp wallet list

# Get wallet details
mp wallet retrieve --wallet "my-wallet"

# Export (interactive only)
mp wallet export --wallet "my-wallet"

# Delete wallet
mp wallet delete --wallet "my-wallet" --confirm
```

## 💰 Check Balances & Portfolio

```bash
# List token balances
mp token balance list --wallet <address> --chain solana
mp token balance list --wallet 0x... --chain ethereum

# Bitcoin balance (separate command)
mp bitcoin balance retrieve --wallet <btc-address>

# Supported chains: solana, ethereum, base, polygon, arbitrum, optimism, bnb, avalanche, tron, bitcoin, ton
```

## 🔄 Swap & Bridge Tokens

```bash
# Same-chain swap (SOL → USDC)
mp token swap \
  --wallet main \
  --chain solana \
  --from-token So11111111111111111111111111111111111111111 \
  --from-amount 0.1 \
  --to-token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Cross-chain bridge (ETH → USDC on Polygon)
mp token bridge \
  --from-wallet funded \
  --from-chain ethereum \
  --from-token 0x0000000000000000000000000000000000000000 \
  --from-amount 0.003 \
  --to-chain polygon \
  --to-token 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

# Exact-out swap (specify output amount)
mp token swap --wallet main --chain solana --from-token <addr> --to-amount 10 --to-token <addr>
```

## 💳 Buy Crypto with Fiat

```bash
# Generate checkout URL for credit card purchase
mp buy \
  --token sol \
  --amount 50 \
  --wallet <destination-address> \
  --email user@example.com

# Supported tokens: btc, sol, eth, trx, pol_polygon, usdc, usdc_sol, usdc_base, usdc_arbitrum, usdc_optimism, usdc_polygon, usdt_trx, eth_polygon, eth_optimism, eth_base, eth_arbitrum
```

## 🏦 Virtual Account (Fiat On/Off Ramp)

### Setup
```bash
# Create account and start KYC
mp virtual-account create

# Check status
mp virtual-account retrieve

# Continue KYC
mp virtual-account kyc continue

# List agreements
mp virtual-account agreement list

# Accept agreement (after user reviews URL)
mp virtual-account agreement accept --contentId <id>

# Register wallet
mp virtual-account wallet register --wallet main --chain solana
```

### Onramp (Fiat → Stablecoin)
```bash
# Create onramp (returns bank account details)
mp virtual-account onramp create \
  --name "My Onramp" \
  --fiat USD \
  --stablecoin USDC \
  --wallet <address> \
  --chain solana

# Get onramp details
mp virtual-account onramp retrieve --onrampId <id>

# List onramps
mp virtual-account onramp list

# Create open banking payment
mp virtual-account onramp payment create \
  --onrampId <id> \
  --amount 100 \
  --fiat USD
```

### Offramp (Stablecoin → Fiat)
```bash
# Register bank account
mp virtual-account bank-account register \
  --currency USD \
  --type ACH \
  --accountNumber <number> \
  --routingNumber <number> \
  --providerName "Chase" \
  --givenName John \
  --familyName Doe \
  --email john@example.com

# Create offramp
mp virtual-account offramp create \
  --name "My Offramp" \
  --bankAccountId <id> \
  --stablecoin USDC \
  --chain solana

# Initiate offramp (send stablecoin to bank)
mp virtual-account offramp initiate \
  --wallet main \
  --offrampId <id> \
  --amount 100
```

## 📥 Crypto Deposits (Permissionless)

```bash
# Create multi-chain deposit link
mp deposit create \
  --name "My Payments" \
  --wallet <destination-address> \
  --chain base \
  --token USDC

# List deposit transactions
mp deposit transaction list --id <deposit-id>

# How it works:
# - Generates deposit addresses on Solana, Ethereum, Bitcoin, Tron
# - Anyone can send any token to these addresses
# - Auto-converts to chosen stablecoin on destination chain
# - No login required
```

## 💸 x402 Paid API Requests

```bash
# Make paid API request (auto-handles payment)
mp x402 request \
  --method POST \
  --url <x402-endpoint-url> \
  --body '<json-body>' \
  --wallet <wallet-name> \
  --chain solana

# Upgrade rate limit (x402 endpoint)
mp upgrade --duration day --wallet my-wallet --chain solana
```

## 🔍 Token Discovery

```bash
# Search for tokens
mp token search --query "USDC" --chain solana

# Get token details
mp token retrieve --token <address> --chain solana

# Get trending tokens
mp token trending --chain solana
```

## 🔧 MCP Server Setup

```bash
# Add MoonPay as MCP server for Claude Code
claude mcp add moonpay -- mp mcp

# For Claude Desktop, add to config:
# ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "moonpay": {
      "command": "mp",
      "args": ["mcp"]
    }
  }
}
```

## 📊 Key Features We Can Learn From

### 1. **Autonomous Auth Flow**
- Email OTP (no password)
- Can be automated with email access
- Session stored in `~/.config/moonpay/credentials.json`

### 2. **Local Wallet Management**
- Encrypted with AES-256-GCM
- Keys stored in OS keychain
- Never leaves the machine
- Supports HD wallets (BIP39)

### 3. **Multi-Chain Support**
- Solana, Ethereum, Base, Polygon, Arbitrum, Optimism, BNB, Avalanche, Bitcoin, Tron, TON
- Unified interface across chains

### 4. **Fiat Integration**
- Credit card purchases (checkout URL)
- Virtual accounts (bank transfers)
- On-ramp and off-ramp

### 5. **x402 Payment Protocol**
- Automatic payment handling
- Retry with payment proof
- No manual transaction building

### 6. **MCP Integration**
- All CLI commands available as MCP tools
- Works with Claude Desktop/Code
- Enables AI agent autonomy

## 🎯 What Algopay Can Adopt

### Already Have ✅
- Email OTP auth
- Local session management
- Wallet operations (via Intermezzo)
- x402 payment flow
- MCP integration

### Should Add 🔧
1. **Better wallet funding UX**
   - Multi-chain deposit addresses (like `mp deposit create`)
   - Auto-convert any token to USDC
   - QR codes for easy deposits

2. **Fiat on-ramp integration**
   - Partner with MoonPay or similar
   - Virtual account setup
   - Bank transfer support

3. **Token discovery**
   - Search tokens by name/symbol
   - Trending tokens
   - Token metadata

4. **Portfolio view**
   - Multi-chain balance aggregation
   - USD values
   - Allocation percentages

5. **Swap routing**
   - Best price across DEXs
   - Auto-approval for ERC20
   - Exact-out swaps

6. **Better CLI UX**
   - `--json` flag for all commands
   - Consistent error messages
   - Progress indicators

## 📝 Command Comparison

| Feature | MoonPay | Algopay | Status |
|---------|---------|---------|--------|
| Auth (Email OTP) | ✅ | ✅ | Done |
| Local wallets | ✅ (encrypted) | ✅ (Intermezzo) | Done |
| Check balance | ✅ | ✅ | Done |
| Send tokens | ✅ | ✅ | Done |
| Swap tokens | ✅ | ✅ (Vestige) | Done |
| Bridge tokens | ✅ | ❌ | Missing |
| Buy with fiat | ✅ | ❌ | Missing |
| Virtual account | ✅ | ❌ | Missing |
| Deposit links | ✅ | ❌ | Missing |
| x402 payments | ✅ | ✅ | Done |
| Token search | ✅ | ❌ | Missing |
| MCP server | ✅ | ✅ | Done |
| Multi-chain | ✅ (11 chains) | ✅ (Algorand) | Algorand-only |

## 🚀 Next Steps for Algopay

1. **Test existing features** (auth, balance, send, x402)
2. **Add fiat on-ramp** (MoonPay partnership or Pera Fund)
3. **Improve deposit UX** (multi-chain addresses, QR codes)
4. **Add token discovery** (search, trending, metadata)
5. **Better error handling** (like MoonPay's clear messages)
6. **Add `--json` flag** to all commands
7. **Portfolio dashboard** (multi-asset view with USD values)

The MoonPay CLI is an excellent reference for UX, command structure, and feature completeness!
