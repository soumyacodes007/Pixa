"""
Authentication module for Algopay
Handles authentication flow with Intermezzo wallet creation

CURRENT IMPLEMENTATION STATUS:
- Real OTP generation and verification with bcrypt
- Real email delivery via SMTP
- Real database storage with PostgreSQL
- Intermezzo integration: READY (Algorand Foundation custodial API on HashiCorp Vault)

PRODUCTION ARCHITECTURE (from agents.md):
1. User initiates login with email
2. Backend generates OTP, sends via email → returns flowId
3. User verifies OTP
4. Intermezzo creates/attaches wallet to user's email identity
5. Backend issues JWT session token

CURRENT FLOW:
1. User initiates login with email → generates OTP and flowId
2. Backend sends OTP via email (SMTP)
3. Backend stores flow in database with hashed OTP
4. User verifies OTP → backend checks database
5. Intermezzo creates wallet for user
6. Backend issues JWT session token
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .intermezzo_client import IntermezzoClient
from .database import AuthFlow, User, get_db
from .otp_utils import generate_otp, hash_otp, verify_otp, generate_flow_id
from .email_service import get_email_service

logger = logging.getLogger(__name__)


# Configuration (load from environment variables in production)
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# GoPlausible doAuth configuration (Future integration - not yet publicly available)
# When GoPlausible doAuth API becomes available, these will be used
GOPLAUSIBLE_AUTH_URL = os.getenv("GOPLAUSIBLE_AUTH_URL", "")  # TBD when API is public
GOPLAUSIBLE_CLIENT_ID = os.getenv("GOPLAUSIBLE_CLIENT_ID", "")
GOPLAUSIBLE_CLIENT_SECRET = os.getenv("GOPLAUSIBLE_CLIENT_SECRET", "")

# Intermezzo configuration (Production-ready Algorand Foundation custodial API)
INTERMEZZO_URL = os.getenv("INTERMEZZO_URL", "http://localhost:3000")  # Default Intermezzo port
INTERMEZZO_VAULT_TOKEN = os.getenv("INTERMEZZO_VAULT_TOKEN", "")
INTERMEZZO_VAULT_ROLE_ID = os.getenv("INTERMEZZO_VAULT_ROLE_ID", "")
INTERMEZZO_VAULT_SECRET_ID = os.getenv("INTERMEZZO_VAULT_SECRET_ID", "")

# OTP configuration
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))

security = HTTPBearer()


# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    network: str = "testnet"


class VerifyRequest(BaseModel):
    flowId: str
    otp: str


class LoginResponse(BaseModel):
    flowId: str
    message: str


class VerifyResponse(BaseModel):
    sessionToken: str
    email: str
    address: str


class TokenData(BaseModel):
    email: str
    address: str


# Helper functions


async def get_intermezzo_wallet(email: str, network: str) -> str:
    """
    Get or create wallet from Intermezzo for the authenticated user
    This is called after authentication succeeds
    
    NOTE: Intermezzo creates wallets in HashiCorp Vault during initialization.
    The manager wallet is used for all operations. In production, you would:
    1. Use Vault's approle authentication
    2. Create user-specific wallets or use sub-accounts
    3. Map email → wallet address in your database
    
    For Phase 1, we're using the manager wallet for all users (development only).
    """
    try:
        # Initialize Intermezzo client
        intermezzo = IntermezzoClient(
            base_url=INTERMEZZO_URL,
            vault_token=INTERMEZZO_VAULT_TOKEN
        )
        
        async with intermezzo:
            # Authenticate with Vault
            await intermezzo.authenticate()
            
            # Get manager wallet (in production, create user-specific wallet)
            # TODO: Implement user-specific wallet creation when Intermezzo supports it
            wallet_data = await intermezzo.create_wallet(
                user_id=email  # Use email as user identifier
            )
            
            return wallet_data["address"]
    except Exception as e:
        logger.error(f"Intermezzo wallet service error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Intermezzo wallet service unavailable: {str(e)}"
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> TokenData:
    """Verify JWT token and return token data"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        address: str = payload.get("address")
        if email is None or address is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return TokenData(email=email, address=address)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> TokenData:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return verify_token(token)


# Auth flow functions
async def initiate_login(email: str, network: str, db: AsyncSession) -> LoginResponse:
    """
    Initiate login flow with OTP generation and email delivery
    Returns flowId for verification step
    """
    try:
        # Generate OTP and flow ID
        otp_code = generate_otp()
        flow_id = generate_flow_id()
        otp_hashed = hash_otp(otp_code)
        
        # Calculate expiry time
        created_at = datetime.now(timezone.utc)
        expires_at = created_at + timedelta(minutes=OTP_EXPIRY_MINUTES)
        
        # Store in database
        auth_flow = AuthFlow(
            flow_id=flow_id,
            email=email,
            network=network,
            otp_hash=otp_hashed,
            created_at=created_at,
            expires_at=expires_at,
            verified=False,
            attempts=0,
            max_attempts=OTP_MAX_ATTEMPTS
        )
        db.add(auth_flow)
        await db.commit()
        
        # Send OTP via email
        email_service = get_email_service()
        try:
            await email_service.send_otp_email(
                to_email=email,
                otp_code=otp_code,
                expiry_minutes=OTP_EXPIRY_MINUTES
            )
            message = f"Verification code sent to {email}"
        except Exception as e:
            logger.error(f"Failed to send OTP email: {e}")
            # Don't fail the request if email fails - user can retry
            message = f"Verification code generated (email delivery may be delayed)"
        
        return LoginResponse(
            flowId=flow_id,
            message=message
        )
    except Exception as e:
        logger.error(f"Login initiation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate login: {str(e)}"
        )


async def verify_otp_code(flow_id: str, otp: str, db: AsyncSession) -> VerifyResponse:
    """
    Verify OTP and create session with Intermezzo wallet
    """
    try:
        # Get flow from database
        result = await db.execute(
            select(AuthFlow).where(AuthFlow.flow_id == flow_id)
        )
        auth_flow = result.scalar_one_or_none()
        
        if not auth_flow:
            raise HTTPException(status_code=404, detail="Flow not found or expired")
        
        # Check if already verified
        if auth_flow.verified:
            raise HTTPException(status_code=400, detail="Flow already verified")
        
        # Check expiry
        if datetime.now(timezone.utc) > auth_flow.expires_at:
            await db.delete(auth_flow)
            await db.commit()
            raise HTTPException(status_code=400, detail="Flow expired")
        
        # Check max attempts
        if auth_flow.attempts >= auth_flow.max_attempts:
            await db.delete(auth_flow)
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail=f"Maximum verification attempts ({auth_flow.max_attempts}) exceeded"
            )
        
        # Increment attempts
        auth_flow.attempts += 1
        await db.commit()
        
        # Verify OTP
        if not verify_otp(otp, auth_flow.otp_hash):
            # Check if this was the last attempt
            if auth_flow.attempts >= auth_flow.max_attempts:
                await db.delete(auth_flow)
                await db.commit()
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid OTP. Maximum attempts exceeded."
                )
            
            remaining = auth_flow.max_attempts - auth_flow.attempts
            raise HTTPException(
                status_code=401,
                detail=f"Invalid OTP. {remaining} attempt(s) remaining."
            )
        
        # OTP verified successfully
        email = auth_flow.email
        network = auth_flow.network
        
        # Mark as verified
        auth_flow.verified = True
        await db.commit()
        
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == email, User.network == network)
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Update last login
            user.last_login = datetime.now(timezone.utc)
            wallet_address = user.wallet_address
        else:
            # Get wallet address from Intermezzo
            wallet_address = await get_intermezzo_wallet(email, network)
            
            # Create new user
            user = User(
                email=email,
                wallet_address=wallet_address,
                network=network,
                created_at=datetime.now(timezone.utc),
                last_login=datetime.now(timezone.utc)
            )
            db.add(user)
        
        await db.commit()
        
        # Clean up auth flow
        await db.delete(auth_flow)
        await db.commit()
        
        # Create session token
        token_data = {
            "email": email,
            "address": wallet_address,
            "network": network
        }
        access_token = create_access_token(token_data)
        
        return VerifyResponse(
            sessionToken=access_token,
            email=email,
            address=wallet_address
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )
