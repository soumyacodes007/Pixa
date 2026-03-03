hey we are building the agentic payment wallet for algorand which will be similar to coinbase awal .
for each task see reference code first 
test it (write tests first for connection then write code then test it )



https://docs.cdp.coinbase.com/agentic-wallet/skills/overview

this is your inspiration 


### the arch 
AI Agent / User
       ↓ (CLI or MCP skill calls)
Algopay CLI (`npx algopay`)
       ↓
MCP Runtime Layer (Production)
   ├── algorand-mcp SERVER (125+ tools)
   └── algorand-remote-mcp-lite (Wallet Edition – OAuth/OIDC + signing)
       ↓
Backend (FastAPI – Render / Railway / AWS)
   ├── Auth middleware (email OTP / OAuth)
   ├── Guardrails (spending limits, reputation, KYT)
   ├── Tx builder (AlgoKit – atomic groups)
   └── Signing Service → Intermezzo (Algorand Foundation custodial API on HashiCorp Vault)
                  ↓ (REST calls)
ARC-58 Smart Wallet (on-chain)
   ├── Fee Pooling via Atomic Groups (backend wallet pays ALL fees)
   ├── x402 + AP2 dual-protocol support
   ├── Plugins (revenue split, escrow, dynamic limits)
   └── Vestige MCP integration (price feeds + smart swap routing)
                  ↓
Algorand Mainnet / Testnet
       ↑
Ecosystem Services
   x402 Bazaar (GoPlausible) + AP2 Endpoints + Vestige MCP



This is the exact stack recommended by Algorand Foundation + GoPlausible for production agentic wallets.
Keys never touch the agent/LLM or CLI.
Intermezzo provides AWAL-level TEE-like security (custodial API on Vault).
Fee pooling = true gasless UX.
Everything is already live in production (WorldChess uses Intermezzo).
Complete AWAL → Algopay Feature & Command Mapping



AWAL Feature / Command Algopay Production Command How It Works (Production Stack)npx awal status npx algopay status MCP runtime queries Intermezzo + ARC-58 state + indexernpx awal auth login <email> npx algopay auth login <email> GoPlausible OAuth/OTP → returns flowId (Intermezzo session)npx awal auth verify <flowId> <otp> npx algopay auth verify <flowId> <otp> Completes auth; Intermezzo creates/attaches walletnpx awal balance [--chain] npx algopay balance Algorand indexer + native USDC asset query via MCPnpx awal address npx algopay address Returns ARC-58 smart wallet addressnpx awal show npx algopay show Opens React companion dashboard (Vercel-hosted)npx awal send <amount> <recipient> npx algopay send <amount> <recipient> Backend builds atomic group → Intermezzo signs → fee poolingnpx awal trade <amount> <from> <to> npx algopay trade <amount> <from> <to> Vestige MCP for routing → Tinyman/Humble swap in atomic group → fee poolingnpx awal x402 bazaar search <query> npx algopay x402 bazaar search <query> Direct call to GoPlausible Bazaar (cached locally)npx awal x402 pay <url> npx algopay x402 pay <url> MCP runtime → Intermezzo signs payment tx → GoPlausible facilitatorFund Wallet skill npx algopay fund Opens Pera Fund / Circle onramp or direct USDC deposit to ARC-58 addressAuthenticate Wallet skill npx algopay auth login ... + verify Same as aboveSend USDC skill npx algopay send ... Same as send commandTrade Tokens skill npx algopay trade ... Same as trade command (Vestige routing)Search for Service skill npx algopay x402 bazaar search ... Same as search commandPay for Service skill npx algopay x402 pay ... Same as pay commandMonetize Service skill npx algopay monetize <endpoint> One-command deploy of x402 paywall + ARC-58 pluginSpending Limits Built-in (via --limit or config) Stored in ARC-58 state + enforced by Intermezzo before signingKYT / Risk Screening Automatic in backend + Intermezzo Blocklist + future oracle integrationGasless Trading Automatic (Fee Pooling) Backend wallet pays all fees in atomic groupSecurity / Key Isolation Intermezzo (custodial API on HashiCorp Vault) Keys never leave Intermezzo enclave-like environment--json output on all commands npx
 algopay ... --json Supported on every commandAll commands
 support --json and --network testnet/mainne
t.This is the final, production-grade version.You can now build and ship Alogopay with the exact same UX as AWAL, but on Algorand (faster, cheaper, fully open, with native fee pooling and dual x402+AP2 support).




## 5. Security Boundaries (Critical for Agents)

**NEVER** do these inside any agent/LLM context:
- Generate or store private keys
- Call raw `algosdk` signing functions
- Bypass Intermezzo

**Always** route through:
```python
# Correct pattern
response = await intermezzo_client.sign_transaction(unsigned_tx, context)
Intermezzo is the only place keys exist.



Production Runtime Stack (Must Know

)Build time: VibeKit (npx vibekit init
)Runtime: algorand-remote-mcp-lite (Wallet Edition
)Signing: Self-hosted Intermezzo (Vault
)Hosting: Backend on Render/Railway, Intermezzo in Docker
8. External References (Always Check These First)

Official Intermezzo: https://github.com/algorandfoundation/intermezzo
GoPlausible x402 + MCP: https://github.com/goplausible
algorand-remote-mcp-lite: https://github.com/algorand-devrel/algorand-remote-mcp-lite
Vestige MCP: https://github.com/vestige-fi/vestige-mcp
ARC-58 Smart Wallet: Algorand Developer Retreat repo
GitHub
GitHub - algorandfoundation/intermezzo: Algorand Integration using Hashicorp Vault as a KMS. Supports both a REST API and CLI modes.

Algorand Integration using Hashicorp Vault as a KMS. Supports both a REST API and CLI modes. - GitHub - algorandfoundation/intermezzo: Algorand Integration using Hashico...

