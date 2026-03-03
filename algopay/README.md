# Algopay - Agentic Payment Wallet for Algorand

Production-ready agentic payment wallet that provides AWAL-compatible UX on Algorand with 3.3s finality, native fee pooling, and dual x402+AP2 protocol support.

## Architecture

```
AI Agent / User
       ↓
Algopay CLI (npx algopay)
       ↓
MCP Runtime Layer
   ├── algorand-mcp (125+ tools)
   └── algorand-remote-mcp-lite (Wallet Edition)
       ↓
Backend (FastAPI)
   ├── Auth (GoPlausible OAuth/OTP)
   ├── Guardrails (limits, KYT)
   ├── Tx Builder (AlgoKit)
   └── Signing → Intermezzo (Vault)
       ↓
ARC-58 Smart Wallet (on-chain)
   ├── Fee Pooling
   ├── x402 + AP2
   └── Vestige MCP
       ↓
Algorand Network
```

## Quick Start

```bash
# Install
npx algopay@latest

# Authenticate
npx algopay auth login your@email.com
npx algopay auth verify <flowId> <otp>

# Check status
npx algopay status

# Send USDC (gasless!)
npx algopay send 10 RECIPIENT_ADDRESS

# Trade tokens
npx algopay trade 5 usdc algo

# Open companion window
npx algopay show
```

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start CLI in dev mode
npm run dev:cli

# Start backend in dev mode
npm run dev:backend
```

## Project Structure

```
algopay/
├── packages/
│   ├── cli/              # TypeScript CLI
│   ├── backend/          # FastAPI backend
│   └── shared/           # Shared types
├── docker/
│   └── intermezzo/       # Intermezzo setup
└── docs/                 # Documentation
```

## Security

- Keys NEVER touch CLI or agent context
- All signing via Intermezzo (Vault-backed)
- Spending limits enforced at multiple layers
- KYT screening on all transactions
- TEE-like security for autonomous operations

## Reference

- Intermezzo: https://github.com/algorandfoundation/intermezzo
- GoPlausible: https://github.com/goplausible
- Vestige MCP: https://github.com/vestige-fi/vestige-mcp
- algorand-mcp: https://github.com/GoPlausible/algorand-mcp

## License

MIT
