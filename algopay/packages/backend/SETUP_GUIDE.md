# Algopay Backend Setup Guide

## Prerequisites

- Python 3.9+
- Docker and Docker Compose
- PostgreSQL (via Docker)

## Step 1: Start PostgreSQL Database

```bash
cd algopay/packages/backend
docker-compose -f docker-compose.db.yml up -d
```

This will start PostgreSQL on `localhost:5432` with:
- Database: `algopay`
- User: `algopay`
- Password: `algopay`

Check database is running:
```bash
docker ps | grep algopay-postgres
```

## Step 2: Install Python Dependencies

```bash
pip install -r requirements-dev.txt
```

## Step 3: Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and configure:

### Required Configuration:
- `DATABASE_URL`: Already configured for local Docker PostgreSQL
- `JWT_SECRET_KEY`: Generate a secure random key for production

### Email Configuration (for OTP delivery):

#### Option 1: Gmail SMTP (Development)
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@algopay.io
```

**Note**: For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an "App Password" at https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password)

#### Option 2: Other SMTP Providers
- **SendGrid**: Set `EMAIL_PROVIDER=sendgrid` (requires implementation)
- **AWS SES**: Set `EMAIL_PROVIDER=ses` (requires implementation)

### Intermezzo Configuration:
```env
INTERMEZZO_URL=http://localhost:3000
INTERMEZZO_VAULT_TOKEN=your-vault-token
```

**Note**: Intermezzo must be running separately. See `algopay/docker/intermezzo/README.md`

## Step 4: Initialize Database

The database tables will be created automatically when you start the FastAPI server.

Alternatively, you can test the database connection:
```bash
python test_db_connection.py
```

## Step 5: Run the Backend Server

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Step 6: Test the Authentication Flow

### 1. Initiate Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "network": "testnet"}'
```

Response:
```json
{
  "flowId": "flow_abc123...",
  "message": "Verification code sent to test@example.com"
}
```

**Note**: Check your email for the 6-digit OTP code.

### 2. Verify OTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"flowId": "flow_abc123...", "otp": "123456"}'
```

Response:
```json
{
  "sessionToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "email": "test@example.com",
  "address": "ALGORAND_ADDRESS_HERE"
}
```

### 3. Access Protected Endpoint
```bash
curl -X GET http://localhost:8000/api/v1/wallet/status \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

## Step 7: Run Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run with coverage
python -m pytest tests/ --cov=src --cov-report=html
```

## Troubleshooting

### Database Connection Issues

1. Check PostgreSQL is running:
```bash
docker ps | grep algopay-postgres
```

2. Check database logs:
```bash
docker logs algopay-postgres
```

3. Test connection manually:
```bash
docker exec -it algopay-postgres psql -U algopay -d algopay
```

### Email Delivery Issues

1. Check SMTP credentials are correct in `.env`
2. For Gmail, ensure you're using an App Password (not regular password)
3. Check email service logs in the FastAPI console

### Intermezzo Connection Issues

1. Ensure Intermezzo is running:
```bash
cd algopay/docker/intermezzo
docker-compose up -d
```

2. Check Intermezzo health:
```bash
curl http://localhost:3000/health
```

3. Verify Vault token is correct in `.env`

## Production Deployment

### Security Checklist:
- [ ] Change `JWT_SECRET_KEY` to a secure random value
- [ ] Use production-grade SMTP service (SendGrid, AWS SES)
- [ ] Configure proper CORS origins (not `*`)
- [ ] Use HTTPS for all endpoints
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Enable database connection pooling
- [ ] Set up monitoring and logging
- [ ] Use environment-specific `.env` files
- [ ] Never commit `.env` files to git

### Environment Variables for Production:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@prod-db:5432/algopay
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
EMAIL_PROVIDER=sendgrid  # or ses
SMTP_HOST=smtp.sendgrid.net
SMTP_USERNAME=apikey
SMTP_PASSWORD=<sendgrid-api-key>
INTERMEZZO_URL=https://intermezzo.prod.algopay.io
INTERMEZZO_VAULT_TOKEN=<production-vault-token>
```

## Next Steps

1. Set up Intermezzo with HashiCorp Vault
2. Configure production email service
3. Implement rate limiting for auth endpoints
4. Add database migrations with Alembic
5. Set up monitoring and alerting
6. Implement user wallet management endpoints
7. Add transaction signing endpoints
8. Integrate with Algorand MCP tools

## Support

For issues or questions:
- Check the main README: `algopay/README.md`
- Review architecture docs: `agents.md`
- Check Intermezzo docs: https://github.com/algorandfoundation/intermezzo
