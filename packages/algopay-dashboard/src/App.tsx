import { useState, useEffect } from 'react'
import './App.css'

interface WalletStatus {
  address: string
  network: string
  authenticated: boolean
  algodStatus: { lastRound: number }
}

interface Balance {
  address: string
  network: string
  algo: { amount: number; displayAmount: string }
  assets: Array<{ id: number; name: string; amount: number; displayAmount: string }>
}

interface Transaction {
  id: string
  type: string
  sender: string
  receiver?: string
  amount?: number
  asset?: string
  fee: number
  confirmedRound: number
  timestamp: number
}

interface SpendingLimit {
  amount: number
  period: string
  asset: string
  used: number
}

function App() {
  const [status, setStatus] = useState<WalletStatus | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [limits, setLimits] = useState<SpendingLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)

  // Get backend URL from environment or default
  const backendUrl = import.meta.env.VITE_ALGOPAY_BACKEND_URL || 'http://localhost:3001'

  // Fetch session token from localStorage
  const getSessionToken = () => {
    try {
      const config = localStorage.getItem('algopay-config')
      if (config) {
        const parsed = JSON.parse(config)
        return parsed.sessionToken
      }
    } catch {
      // Ignore parse errors
    }
    return null
  }

  // API helper with auth
  const apiCall = async (endpoint: string) => {
    const token = getSessionToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return response.json()
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if authenticated
        const token = getSessionToken()
        if (!token) {
          setError('Not authenticated. Please login using the CLI: algopay auth login <email>')
          return
        }

        // Load wallet status, balance, and recent transactions
        const [statusData, balanceData, txData] = await Promise.all([
          apiCall('/api/wallet/status'),
          apiCall('/api/wallet/balance'),
          apiCall('/api/wallet/history?limit=10')
        ])

        setStatus(statusData)
        setBalance(balanceData)
        setTransactions(txData)

        // Try to load spending limits (may not be configured)
        try {
          const limitsData = await apiCall('/api/config/limits')
          setLimits(limitsData)
        } catch {
          // Limits not configured, that's ok
          setLimits([])
        }

      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [backendUrl])

  // WebSocket for live updates
  useEffect(() => {
    const token = getSessionToken()
    if (!token || !status) return

    const wsUrl = backendUrl.replace('http', 'ws') + '/ws'
    const websocket = new WebSocket(wsUrl, ['algopay-token', token])

    websocket.onopen = () => {
      console.log('WebSocket connected')
      setWs(websocket)
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'balance_update') {
          setBalance(data.balance)
        } else if (data.type === 'new_transaction') {
          setTransactions(prev => [data.transaction, ...prev.slice(0, 9)])
        }
      } catch (err) {
        console.error('WebSocket message error:', err)
      }
    }

    websocket.onclose = () => {
      console.log('WebSocket disconnected')
      setWs(null)
    }

    websocket.onerror = (err) => {
      console.error('WebSocket error:', err)
    }

    return () => {
      websocket.close()
    }
  }, [status, backendUrl])

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading wallet data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <div className="error-help">
            <h3>To get started:</h3>
            <ol>
              <li>Install Algopay CLI: <code>npm install -g algopay</code></li>
              <li>Login: <code>algopay auth login your@email.com</code></li>
              <li>Verify: <code>algopay auth verify &lt;flowId&gt; &lt;otp&gt;</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Algopay Dashboard</h1>
        <div className="connection-status">
          <span className={`status-dot ${ws ? 'connected' : 'disconnected'}`}></span>
          {ws ? 'Live' : 'Offline'}
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Wallet Status */}
        <div className="card">
          <h2>Wallet Status</h2>
          {status && (
            <div className="status-info">
              <div className="status-item">
                <label>Address:</label>
                <code>{status.address.slice(0, 8)}...{status.address.slice(-8)}</code>
              </div>
              <div className="status-item">
                <label>Network:</label>
                <span className={`network ${status.network}`}>{status.network}</span>
              </div>
              <div className="status-item">
                <label>Last Round:</label>
                <span>{status.algodStatus.lastRound.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="card">
          <h2>Balance</h2>
          {balance && (
            <div className="balance-info">
              <div className="balance-item primary">
                <span className="amount">{balance.algo.displayAmount}</span>
                <span className="asset">ALGO</span>
              </div>
              {balance.assets.map(asset => (
                <div key={asset.id} className="balance-item">
                  <span className="amount">{asset.displayAmount}</span>
                  <span className="asset">{asset.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spending Limits */}
        <div className="card">
          <h2>Spending Limits</h2>
          {limits.length > 0 ? (
            <div className="limits-info">
              {limits.map((limit, i) => (
                <div key={i} className="limit-item">
                  <div className="limit-header">
                    <span>{limit.amount} {limit.asset} / {limit.period}</span>
                    <span className="usage">{limit.used} used</span>
                  </div>
                  <div className="limit-bar">
                    <div 
                      className="limit-progress" 
                      style={{ width: `${Math.min(100, (limit.used / limit.amount) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No spending limits configured</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card transactions">
          <h2>Recent Transactions</h2>
          {transactions.length > 0 ? (
            <div className="transactions-list">
              {transactions.map(tx => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-main">
                    <span className={`tx-type ${tx.type}`}>{tx.type}</span>
                    <span className="tx-amount">
                      {tx.amount ? `${tx.amount} ${tx.asset || 'ALGO'}` : '—'}
                    </span>
                  </div>
                  <div className="tx-details">
                    <span className="tx-id">{tx.id.slice(0, 8)}...</span>
                    <span className="tx-round">Round {tx.confirmedRound}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No transactions found</p>
          )}
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>Algopay Dashboard • Network: {status?.network}</p>
      </footer>
    </div>
  )
}

export default App
