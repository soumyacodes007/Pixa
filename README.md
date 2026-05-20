# Pixa Wallet

> The first agentic payment wallet built for Algorand — plug into Claude or any agent framework in under 60 seconds.

![Algorand](https://img.shields.io/badge/Algorand-Mainnet-blue?style=flat-square)
![MCP](https://img.shields.io/badge/MCP-Native-black?style=flat-square)
![x402](https://img.shields.io/badge/x402-Supported-green?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-94%25-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)
![Network](https://img.shields.io/badge/Network-Mainnet-brightgreen?style=flat-square)

---

AI agents can reason. They can plan. They can execute.

But they cannot pay — until now.

Pixa is a full-featured MCP wallet that gives AI agents the ability to autonomously discover, authorize, and settle micropayments on Algorand using the x402 protocol. No API keys. No pre-configured billing. No human in the loop unless you want one.



---

## How It Works

```mermaid
sequenceDiagram
    participant U as User / Agent
    participant P as Pixa MCP
    participant A as x402 API
    participant C as Algorand Chain

    U->>P: Request resource (e.g. AI query, data fetch)
    P->>A: HTTP GET /resource
    A-->>P: 402 Payment Required (amount, recipient, network)
    P->>P: Check budget limits
    P->>C: Sign & broadcast USDC authorization
    C-->>P: Transaction confirmed (< 4s)
    P->>A: Retry with payment header
    A-->>P: Resource returned
    P-->>U: Result delivered
```

---

## Architecture

```mermaid
graph TD
    subgraph Agent Layer
        CL[Claude Desktop]
        LG[LangChain / LangGraph]
        CA[Custom Agents]
    end

    subgraph Pixa MCP Server
        MCP[MCP Protocol Handler]
        WM[Wallet Manager]
        PM[Payment Engine x402]
        BL[Budget Limiter]
        SP[Spending Tracker]
    end

    subgraph Algorand Layer
        SDK[AlgoSDK]
        TM[Tinyman DEX]
        NFD[NFD Name Resolver]
        CHAIN[Algorand Mainnet]
    end

    subgraph External Services
        BZ[Pixa Bazaar API Marketplace]
        MX[Mudrex UPI Onramp]
        UAL[Unified Agent Layer]
    end

    CL --> MCP
    LG --> MCP
    CA --> MCP

    MCP --> WM
    MCP --> PM
    MCP --> BL
    MCP --> SP

    WM --> SDK
    PM --> SDK
    BL --> SP

    SDK --> TM
    SDK --> NFD
    SDK --> CHAIN

    PM --> BZ
    WM --> MX
    PM --> UAL
```

---

## Autonomy Modes

```mermaid
graph LR
    subgraph Mode 1: Full Autonomous
        A1[Agent decides] --> A2[Budget check] --> A3[Pay & proceed]
    end

    subgraph Mode 2: Session Based
        B1[User grants session] --> B2[Time + amount limit set] --> B3[Agent operates freely within session]
    end

    subgraph Mode 3: Human in the Loop
        C1[Agent requests payment] --> C2[User approves in wallet] --> C3[Transaction executes]
    end

    style A1 fill:#e8f4fd
    style B1 fill:#e8f4fd
    style C1 fill:#e8f4fd
```

---

## Payment Flow — UPI to Agent

```mermaid
flowchart LR
    UPI[User pays via UPI] --> MX[Mudrex API]
    MX --> USDC[USDC in Pixa Treasury]
    USDC --> AGENT[Agent picks up balance]
    AGENT --> API[Pays x402 gated API]
    API --> RESULT[Returns result to user]

    style UPI fill:#f0fdf4
    style RESULT fill:#f0fdf4
```

---

## Installation

### Non-Technical Users — One Click

Download the `.mcpb` extension and double-click. Pixa installs automatically into Claude Desktop. No terminal. No configuration files.

**[Download Latest Release →](https://github.com/soumyacodes007/Pixa/releases/latest)**

---

### Developers — JSON Config

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pixa": {
      "command": "npx",
      "args": ["-y", "pixa-wallet-mcp"],
      "env": {
        "ALGORAND_MNEMONIC": "your 25-word mnemonic here",
        "NETWORK": "algorand-mainnet",
        "MAX_PER_CALL": "0.10",
        "MAX_PER_DAY": "20.00"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

### Custom Agents — LangChain / LangGraph

```python
from langchain_mcp import MCPToolkit

toolkit = MCPToolkit(
    server_command="npx",
    server_args=["-y", "pixa-wallet-mcp"],
    env={
        "ALGORAND_MNEMONIC": "your 25-word mnemonic",
        "NETWORK": "algorand-mainnet",
        "MAX_PER_CALL": "0.50",
        "MAX_PER_DAY": "50.00"
    }
)

tools = toolkit.get_tools()
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ALGORAND_MNEMONIC` | Yes | — | 25-word Algorand wallet mnemonic |
| `NETWORK` | No | `algorand-mainnet` | `algorand-mainnet` or `algorand-testnet` |
| `MAX_PER_CALL` | No | `0.10` | Max USDC per single payment (USD) |
| `MAX_PER_DAY` | No | `20.00` | Daily spending cap (USD) |

---

## Tools Reference

### Wallet Operations

| Tool | Description |
|---|---|
| `check_balance` | View current USDC and ALGO balances |
| `transfer_usdc` | Send USDC to any Algorand address or NFD name |
| `transfer_algo` | Send ALGO for gas or transfers |
| `spending_report` | Full audit trail — per-call and daily usage |
| `request_funding` | Generate Algorand payment URI for top-up |

### x402 Payment Protocol

| Tool | Description |
|---|---|
| `pay` | Sign and broadcast x402 payment authorization |
| `x402_fetch` | Fetch any URL with automatic 402 payment handling |
| `search_bazaar` | Discover x402-gated AI services on Pixa Bazaar |

### DeFi

| Tool | Description |
|---|---|
| `tinyman_swap` | Swap tokens on Tinyman DEX |
| `create_token` | Create custom ASA tokens on Algorand |

---

## Live Demo

Test Pixa against the Unified Agent Layer endpoint:

```
https://unified-agent-layer-production.up.railway.app/v1/chat
```

Ask your agent:

> "Access https://unified-agent-layer-production.up.railway.app/v1/chat and explain quantum computing"

What happens:

1. Agent detects the `402 Payment Required` response
2. Pixa checks your budget limits
3. Signs a USDC payment authorization on Algorand mainnet
4. Transaction confirms in under 4 seconds
5. Agent retries with payment header and returns the response

---

## Security

- **Budget limits** — configurable max per call and daily caps enforced before any transaction
- **Three autonomy modes** — full autonomous, session-based, or human-in-the-loop
- **Spending tracker** — complete on-chain audit trail of every payment
- **NFD resolution** — human-readable names instead of raw wallet addresses
- **Secure key storage** — mnemonics stored in OS keychain for `.mcpb` installs
- **Transaction confirmation** — waits for on-chain finality before returning results

---

## Why Algorand

| | Algorand | EVM Chains |
|---|---|---|
| Block finality | ~3.3 seconds | 12s+ (probabilistic) |
| Fee per transaction | < $0.001 | $0.50–$5.00+ |
| Atomic transactions | Native | Smart contract workaround |
| Native USDC | Yes (Circle) | Bridged |
| Micropayment viability | Yes | No — gas exceeds payment value |

---

## Roadmap

**Now — Live on Mainnet**
- Full wallet operations, x402 payments, Tinyman DEX, NFD resolution
- `.mcpb` one-click install for non-technical users
- Budget controls and spending tracking

**Next — UPI Onramp**
- UPI-to-USDC widget via Mudrex API
- Zero-friction India onboarding — pay like you order food, agent handles everything downstream

**Future — Non-Custodial**
- Smart contract-based treasury replacing backend custody
- Multi-sig for large transactions
- Time-locked payments and recipient whitelisting

**Future — Multi-Chain**
- Expand to additional chains while keeping Algorand as settlement layer
- Cross-chain routing abstracted entirely from agent and user

---

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js 18+
- **Protocol:** Model Context Protocol (MCP)
- **Blockchain:** Algorand Mainnet
- **SDKs:** AlgoSDK, @x402-avm
- **DeFi:** Tinyman DEX
- **Identity:** NFD Name Resolution
- **Package:** `.mcpb` (MCP Bundle)

---

## Network Status

| | |
|---|---|
| Network | Algorand Mainnet |
| Smart Contract | N/A — MCP-based treasury wallet |
| Treasury Explorer | [View on Allo](https://allo.info) |

---

## Contributing

Pull requests welcome. For major changes, open an issue first.

---

## License

MIT — see [LICENSE](./LICENSE)

---

Built for [AlgoBharat HackSeries 3.0](https://algobharat.in) · Agentic Commerce Track