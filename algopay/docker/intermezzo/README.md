# Intermezzo Setup for Algopay

This directory contains the Docker setup for running Intermezzo (Algorand Foundation's custodial signing service on HashiCorp Vault).

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of HashiCorp Vault

## Reference

Before setting up, review the official Intermezzo documentation:
https://github.com/algorandfoundation/intermezzo

## Quick Start

```bash
# Start Intermezzo + Vault
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f intermezzo

# Stop services
docker-compose down
```

## Configuration

See `docker-compose.yml` for service configuration.

Environment variables:
- `VAULT_ADDR`: Vault server address
- `VAULT_TOKEN`: Vault authentication token
- `ALGORAND_NODE`: Algorand node endpoint
- `ALGORAND_INDEXER`: Algorand indexer endpoint

## Testing Connection

Once running, test the connection:

```bash
# Health check
curl http://localhost:8080/health

# Create test wallet (testnet)
curl -X POST http://localhost:8080/wallets \
  -H "Content-Type: application/json" \
  -d '{"name": "test-wallet"}'
```

## Security Notes

- Vault is configured for development only
- In production, use proper Vault authentication
- Never expose Vault tokens in code
- Use separate Vault instances for testnet/mainnet

## Next Steps

1. Review Intermezzo API documentation
2. Test wallet creation
3. Test transaction signing
4. Integrate with backend service
