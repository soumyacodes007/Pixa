# Companion Window Specification

## Overview

The Algopay Companion Window is a local web interface that provides visual feedback for wallet operations. Following Coinbase AWAL's design, it runs as an embedded web server within the CLI and opens automatically when the user executes `npx algopay show`.

## Architecture

```
┌─────────────────────────────────────────┐
│         Algopay CLI Process             │
│  ┌───────────────────────────────────┐  │
│  │   Command Handler                 │  │
│  │   (show command)                  │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────▼────────────────────┐  │
│  │   Embedded Web Server             │  │
│  │   (Express/Fastify)               │  │
│  │   Port: 3420                      │  │
│  │                                   │  │
│  │   Routes:                         │  │
│  │   GET  /                          │  │
│  │   GET  /api/status                │  │
│  │   GET  /api/balance               │  │
│  │   GET  /api/transactions          │  │
│  │   WS   /ws (WebSocket)            │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │   Static Assets                   │  │
│  │   (Bundled HTML/CSS/JS)           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                 │
                 │ HTTP/WebSocket
                 ▼
┌─────────────────────────────────────────┐
│         User's Browser                  │
│   http://localhost:3420                 │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │   Wallet Overview                 │  │
│  │   - Balance                       │  │
│  │   - Address                       │  │
│  │   - Network                       │  │
│  │   - Spending Limits               │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │   Transaction History             │  │
│  │   - Recent transactions           │  │
│  │   - Real-time updates             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Implementation Details

### Technology Stack

**Backend (Embedded Server):**
- Express.js or Fastify (lightweight HTTP server)
- ws (WebSocket library for real-time updates)
- open (npm package to open browser)

**Frontend (Single Page):**
- Vanilla JavaScript (no framework needed)
- Tailwind CSS or simple CSS (for styling)
- WebSocket client for real-time updates

**Bundling:**
- Assets bundled into CLI package
- No separate build process needed at runtime

### File Structure

```
packages/cli/
├── src/
│   ├── commands/
│   │   └── show.ts          # Show command implementation
│   ├── companion/
│   │   ├── server.ts        # Express server
│   │   ├── routes.ts        # API routes
│   │   ├── websocket.ts     # WebSocket handler
│   │   └── assets/
│   │       ├── index.html   # Main page
│   │       ├── styles.css   # Styles
│   │       └── app.js       # Frontend logic
│   └── utils/
│       └── session.ts       # Session management
```

### Server Implementation

```typescript
// companion/server.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import open from 'open';

export class CompanionServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private port: number = 3420;

  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Serve static assets
    this.app.use(express.static(path.join(__dirname, 'assets')));

    // API endpoints
    this.app.get('/api/status', async (req, res) => {
      const status = await this.getWalletStatus();
      res.json(status);
    });

    this.app.get('/api/balance', async (req, res) => {
      const balance = await this.getBalance();
      res.json(balance);
    });

    this.app.get('/api/transactions', async (req, res) => {
      const transactions = await this.getTransactions();
      res.json(transactions);
    });
  }

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Companion server running on http://localhost:${this.port}`);
        
        // Setup WebSocket
        this.wss = new WebSocketServer({ server: this.server });
        this.setupWebSocket();
        
        // Open browser
        open(`http://localhost:${this.port}`);
        
        resolve(`http://localhost:${this.port}`);
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log('Port 3420 already in use, trying next port...');
          this.port++;
          this.start().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected to companion window');

      // Send initial data
      this.sendUpdate(ws);

      // Setup periodic updates
      const interval = setInterval(() => {
        this.sendUpdate(ws);
      }, 5000); // Update every 5 seconds

      ws.on('close', () => {
        clearInterval(interval);
        console.log('Client disconnected');
      });
    });
  }

  private async sendUpdate(ws: any) {
    const data = {
      balance: await this.getBalance(),
      transactions: await this.getTransactions(),
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(data));
  }

  async stop() {
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
    }
  }

  private async getWalletStatus() {
    // Call backend API or MCP runtime
    // Implementation depends on session management
    return {
      address: 'WALLET_ADDRESS',
      network: 'testnet',
      authenticated: true
    };
  }

  private async getBalance() {
    // Call backend API
    return {
      algo: 1.5,
      usdc: 50.0,
      assets: []
    };
  }

  private async getTransactions() {
    // Call backend API
    return [
      {
        id: 'TX123',
        type: 'send',
        amount: 10.0,
        asset: 'USDC',
        timestamp: Date.now() - 3600000
      }
    ];
  }
}
```

### Frontend Implementation

```html
<!-- companion/assets/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Algopay Wallet</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Algopay Wallet</h1>
      <div class="network-badge" id="network">testnet</div>
    </header>

    <section class="wallet-overview">
      <div class="balance-card">
        <h2>Balance</h2>
        <div class="balance-amount" id="balance">
          <span class="amount">0.00</span>
          <span class="currency">USDC</span>
        </div>
        <div class="algo-balance" id="algo-balance">0.00 ALGO</div>
      </div>

      <div class="info-card">
        <h3>Wallet Address</h3>
        <div class="address" id="address">Loading...</div>
        <button onclick="copyAddress()">Copy</button>
      </div>

      <div class="limits-card">
        <h3>Spending Limits</h3>
        <div class="limit-item">
          <span>Daily Limit:</span>
          <span id="daily-limit">100.00 USDC</span>
        </div>
        <div class="limit-item">
          <span>Remaining:</span>
          <span id="daily-remaining">75.00 USDC</span>
        </div>
      </div>
    </section>

    <section class="transactions">
      <h2>Recent Transactions</h2>
      <div class="transaction-list" id="transactions">
        <div class="loading">Loading transactions...</div>
      </div>
    </section>

    <footer>
      <div class="status">
        <span class="status-indicator" id="status-indicator"></span>
        <span id="status-text">Connected</span>
      </div>
      <div class="last-update">
        Last updated: <span id="last-update">Never</span>
      </div>
    </footer>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

```javascript
// companion/assets/app.js
class AlgopayCompanion {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.init();
  }

  init() {
    this.connectWebSocket();
    this.loadInitialData();
  }

  connectWebSocket() {
    this.ws = new WebSocket('ws://localhost:3420/ws');

    this.ws.onopen = () => {
      console.log('Connected to Algopay');
      this.reconnectAttempts = 0;
      this.updateStatus('Connected', true);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.updateUI(data);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Algopay');
      this.updateStatus('Disconnected', false);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateStatus('Error', false);
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectWebSocket();
      }, 5000);
    } else {
      this.updateStatus('Connection failed', false);
    }
  }

  async loadInitialData() {
    try {
      const [status, balance, transactions] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/balance').then(r => r.json()),
        fetch('/api/transactions').then(r => r.json())
      ]);

      this.updateUI({ balance, transactions });
      document.getElementById('address').textContent = status.address;
      document.getElementById('network').textContent = status.network;
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  updateUI(data) {
    if (data.balance) {
      document.getElementById('balance').querySelector('.amount').textContent = 
        data.balance.usdc.toFixed(2);
      document.getElementById('algo-balance').textContent = 
        `${data.balance.algo.toFixed(4)} ALGO`;
    }

    if (data.transactions) {
      this.renderTransactions(data.transactions);
    }

    document.getElementById('last-update').textContent = 
      new Date().toLocaleTimeString();
  }

  renderTransactions(transactions) {
    const container = document.getElementById('transactions');
    
    if (transactions.length === 0) {
      container.innerHTML = '<div class="no-transactions">No transactions yet</div>';
      return;
    }

    container.innerHTML = transactions.map(tx => `
      <div class="transaction-item ${tx.type}">
        <div class="tx-icon">${tx.type === 'send' ? '↑' : '↓'}</div>
        <div class="tx-details">
          <div class="tx-type">${tx.type.toUpperCase()}</div>
          <div class="tx-time">${this.formatTime(tx.timestamp)}</div>
        </div>
        <div class="tx-amount">
          ${tx.type === 'send' ? '-' : '+'}${tx.amount} ${tx.asset}
        </div>
      </div>
    `).join('');
  }

  updateStatus(text, connected) {
    document.getElementById('status-text').textContent = text;
    const indicator = document.getElementById('status-indicator');
    indicator.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }
}

function copyAddress() {
  const address = document.getElementById('address').textContent;
  navigator.clipboard.writeText(address);
  alert('Address copied to clipboard!');
}

// Initialize
const companion = new AlgopayCompanion();
```

### CSS Styling

```css
/* companion/assets/styles.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #0f0f0f;
  color: #ffffff;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

h1 {
  font-size: 32px;
  font-weight: 600;
}

.network-badge {
  background: #5F27CD;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.wallet-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.balance-card, .info-card, .limits-card {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #2a2a2a;
}

.balance-amount {
  font-size: 48px;
  font-weight: 700;
  margin: 16px 0;
  color: #00D26A;
}

.algo-balance {
  color: #747D8C;
  font-size: 18px;
}

.address {
  font-family: 'Courier New', monospace;
  background: #0f0f0f;
  padding: 12px;
  border-radius: 8px;
  margin: 12px 0;
  word-break: break-all;
  font-size: 14px;
}

button {
  background: #5F27CD;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

button:hover {
  background: #7c3aed;
}

.transactions {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #2a2a2a;
}

.transaction-list {
  margin-top: 16px;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #2a2a2a;
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-icon {
  font-size: 24px;
  margin-right: 16px;
}

.tx-details {
  flex: 1;
}

.tx-type {
  font-weight: 600;
  margin-bottom: 4px;
}

.tx-time {
  color: #747D8C;
  font-size: 14px;
}

.tx-amount {
  font-weight: 600;
  font-size: 18px;
}

.transaction-item.send .tx-amount {
  color: #FF4757;
}

.transaction-item.receive .tx-amount {
  color: #00D26A;
}

footer {
  margin-top: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid #2a2a2a;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #747D8C;
}

.status-indicator.connected {
  background: #00D26A;
  box-shadow: 0 0 8px #00D26A;
}

.last-update {
  color: #747D8C;
  font-size: 14px;
}

.loading, .no-transactions {
  text-align: center;
  color: #747D8C;
  padding: 40px;
}
```

## Command Implementation

```typescript
// commands/show.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { CompanionServer } from '../companion/server';

export function registerShowCommand(program: Command) {
  program
    .command('show')
    .description('Open wallet companion window')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        const server = new CompanionServer();
        const url = await server.start();

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            url,
            pid: process.pid
          }, null, 2));
        } else {
          console.log(chalk.green('✓') + ' Opening wallet companion window...\n');
          console.log('Companion Window:');
          console.log(chalk.cyan(url) + '\n');
          console.log('Your browser should open automatically.');
          console.log('If not, visit the URL above.\n');
          console.log(chalk.gray('Press Ctrl+C to stop the companion server.'));
        }

        // Keep process alive
        process.on('SIGINT', async () => {
          console.log('\n\nStopping companion server...');
          await server.stop();
          process.exit(0);
        });

      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({
            success: false,
            error: error.message
          }, null, 2));
        } else {
          console.log(chalk.red('✗') + ' Failed to start companion window');
          console.log(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
}
```

## Testing Strategy

```typescript
// Test: Companion server
describe('Companion Window', () => {
  let server: CompanionServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  test('starts server on port 3420', async () => {
    server = new CompanionServer();
    const url = await server.start();
    expect(url).toBe('http://localhost:3420');

    const response = await fetch(url);
    expect(response.status).toBe(200);
  });

  test('serves API endpoints', async () => {
    server = new CompanionServer();
    await server.start();

    const statusResponse = await fetch('http://localhost:3420/api/status');
    expect(statusResponse.status).toBe(200);
    const status = await statusResponse.json();
    expect(status).toHaveProperty('address');

    const balanceResponse = await fetch('http://localhost:3420/api/balance');
    expect(balanceResponse.status).toBe(200);
    const balance = await balanceResponse.json();
    expect(balance).toHaveProperty('usdc');
  });

  test('handles WebSocket connections', async (done) => {
    server = new CompanionServer();
    await server.start();

    const ws = new WebSocket('ws://localhost:3420/ws');
    
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toHaveProperty('balance');
      expect(message).toHaveProperty('transactions');
      ws.close();
      done();
    });
  });

  test('falls back to next port if 3420 is busy', async () => {
    // Start first server on 3420
    const server1 = new CompanionServer();
    await server1.start();

    // Start second server (should use 3421)
    server = new CompanionServer();
    const url = await server.start();
    expect(url).toBe('http://localhost:3421');

    await server1.stop();
  });
});
```

## Security Considerations

1. **Local Only**: Server only binds to localhost, not accessible from network
2. **Session Token**: Passed via secure mechanism (not in URL)
3. **CORS**: Restricted to localhost origins only
4. **No Sensitive Data**: Private keys never exposed in UI
5. **Auto-Shutdown**: Server stops when CLI process exits

## Future Enhancements

- Dark/light theme toggle
- Export transaction history as CSV
- QR code display for wallet address
- Spending analytics charts
- Multi-wallet support
- Custom notifications
