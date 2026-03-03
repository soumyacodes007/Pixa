"""
Algopay Backend API - FastAPI Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from src.auth import (
    LoginRequest, VerifyRequest, LoginResponse, VerifyResponse,
    initiate_login, verify_otp_code, get_current_user, TokenData
)
from src.database import init_db, close_db, get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("Starting Algopay backend...")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # Continue anyway - database might already be initialized
    
    yield
    
    # Shutdown
    logger.info("Shutting down Algopay backend...")
    await close_db()
    logger.info("Database connections closed")


# Create FastAPI app
app = FastAPI(
    title="Algopay API",
    description="Agentic Payment Wallet for Algorand",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "algopay-backend",
        "version": "0.1.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Algopay API",
        "docs": "/docs"
    }


# Auth endpoints
@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Initiate login flow with email OTP"""
    return await initiate_login(request.email, request.network, db)


@app.post("/api/v1/auth/verify", response_model=VerifyResponse)
async def verify(request: VerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and create session"""
    return await verify_otp_code(request.flowId, request.otp, db)


# Protected endpoints (example)
@app.get("/api/v1/wallet/status")
async def wallet_status(current_user: TokenData = Depends(get_current_user)):
    """Get wallet status (protected endpoint)"""
    return {
        "email": current_user.email,
        "address": current_user.address,
        "status": "active"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
