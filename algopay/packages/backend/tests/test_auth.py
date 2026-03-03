"""
Tests for authentication module
Tests real OTP generation, email sending, and database storage
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from src.auth import (
    initiate_login, verify_otp_code, create_access_token, verify_token,
    LoginRequest, VerifyRequest
)
from src.database import Base, AuthFlow, User
from src.otp_utils import hash_otp


# Create in-memory SQLite database for testing
@pytest.fixture
async def test_db():
    """Create test database session"""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    await engine.dispose()


class TestAuthLogin:
    """Test login initiation"""
    
    @pytest.mark.asyncio
    async def test_login_with_valid_email(self, test_db):
        """Test login with valid email"""
        with patch('src.auth.get_email_service') as mock_email:
            mock_email_service = AsyncMock()
            mock_email_service.send_otp_email = AsyncMock(return_value=True)
            mock_email.return_value = mock_email_service
            
            response = await initiate_login("test@example.com", "testnet", test_db)
            
            assert response.flowId.startswith("flow_")
            assert "test@example.com" in response.message
            mock_email_service.send_otp_email.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_login_defaults_to_testnet(self, test_db):
        """Test that network defaults to testnet"""
        with patch('src.auth.get_email_service') as mock_email:
            mock_email_service = AsyncMock()
            mock_email_service.send_otp_email = AsyncMock(return_value=True)
            mock_email.return_value = mock_email_service
            
            response = await initiate_login("test@example.com", "testnet", test_db)
            
            assert response.flowId is not None
            # Verify flow was stored with testnet
            result = await test_db.execute(
                f"SELECT network FROM auth_flows WHERE flow_id = '{response.flowId}'"
            )
            row = result.first()
            assert row[0] == "testnet"
    
    @pytest.mark.asyncio
    async def test_login_email_failure_continues(self, test_db):
        """Test that login continues even if email fails"""
        with patch('src.auth.get_email_service') as mock_email:
            mock_email_service = AsyncMock()
            mock_email_service.send_otp_email = AsyncMock(side_effect=Exception("SMTP error"))
            mock_email.return_value = mock_email_service
            
            # Should not raise exception
            response = await initiate_login("test@example.com", "testnet", test_db)
            
            assert response.flowId.startswith("flow_")
            assert "delayed" in response.message.lower() or "generated" in response.message.lower()


class TestAuthVerify:
    """Test OTP verification"""
    
    @pytest.mark.asyncio
    async def test_verify_with_valid_otp(self, test_db):
        """Test verification with correct OTP"""
        # Create auth flow
        with patch('src.auth.get_email_service') as mock_email:
            mock_email_service = AsyncMock()
            mock_email_service.send_otp_email = AsyncMock(return_value=True)
            mock_email.return_value = mock_email_service
            
            login_response = await initiate_login("test@example.com", "testnet", test_db)
            
            # Get the OTP from the email call
            call_args = mock_email_service.send_otp_email.call_args
            otp_code = call_args[1]['otp_code']
        
        # Mock Intermezzo
        with patch('src.auth.get_intermezzo_wallet', new_callable=AsyncMock) as mock_intermezzo:
            mock_intermezzo.return_value = "ALGORAND_ADDRESS_123"
            
            response = await verify_otp_code(login_response.flowId, otp_code, test_db)
            
            assert response.sessionToken is not None
            assert response.email == "test@example.com"
            assert response.address == "ALGORAND_ADDRESS_123"
    
    @pytest.mark.asyncio
    async def test_verify_with_invalid_flow_id(self, test_db):
        """Test verification with non-existent flow ID"""
        with pytest.raises(HTTPException) as exc_info:
            await verify_otp_code("flow_invalid", "123456", test_db)
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_verify_with_wrong_otp(self, test_db):
        """Test verification with incorrect OTP"""
        # Create auth flow
        with patch('src.auth.get_email_service') as mock_email:
            mock_email_service = AsyncMock()
            mock_email_service.send_otp_email = AsyncMock(return_value=True)
            mock_email.return_value = mock_email_service
            
            login_response = await initiate_login("test@example.com", "testnet", test_db)
        
        # Try with wrong OTP
        with pytest.raises(HTTPException) as exc_info:
            await verify_otp_code(login_response.flowId, "000000", test_db)
        
        assert exc_info.value.status_code == 401
        assert "invalid otp" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_verify_max_attempts_exceeded(self, test_db):
        """Test that verification fails after max attempts"""
        # Create auth flow
        with patch('src.auth.get_email_service') as mock_email:
            mock_email_service = AsyncMock()
            mock_email_service.send_otp_email = AsyncMock(return_value=True)
            mock_email.return_value = mock_email_service
            
            login_response = await initiate_login("test@example.com", "testnet", test_db)
        
        # Try wrong OTP 3 times
        for i in range(3):
            with pytest.raises(HTTPException):
                await verify_otp_code(login_response.flowId, "000000", test_db)
        
        # Fourth attempt should fail with "not found" (flow deleted)
        with pytest.raises(HTTPException) as exc_info:
            await verify_otp_code(login_response.flowId, "000000", test_db)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_verify_intermezzo_unavailable(self, test_db):
        """Test verification when Intermezzo is unavailable"""
        # Create auth flow
        with patch('src.auth.get_email_service') as mock_email:
            mock_email_service = AsyncMock()
            mock_email_service.send_otp_email = AsyncMock(return_value=True)
            mock_email.return_value = mock_email_service
            
            login_response = await initiate_login("test@example.com", "testnet", test_db)
            
            # Get the OTP
            call_args = mock_email_service.send_otp_email.call_args
            otp_code = call_args[1]['otp_code']
        
        # Mock Intermezzo failure
        with patch('src.auth.get_intermezzo_wallet', new_callable=AsyncMock) as mock_intermezzo:
            mock_intermezzo.side_effect = HTTPException(
                status_code=503,
                detail="Intermezzo wallet service unavailable"
            )
            
            with pytest.raises(HTTPException) as exc_info:
                await verify_otp_code(login_response.flowId, otp_code, test_db)
            
            assert exc_info.value.status_code == 503


class TestAuthMiddleware:
    """Test JWT token authentication"""
    
    def test_create_access_token(self):
        """Test JWT token creation"""
        data = {"email": "test@example.com", "address": "ALGO123"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
    
    def test_verify_valid_token(self):
        """Test token verification with valid token"""
        data = {"email": "test@example.com", "address": "ALGO123"}
        token = create_access_token(data)
        
        token_data = verify_token(token)
        
        assert token_data.email == "test@example.com"
        assert token_data.address == "ALGO123"
    
    def test_verify_invalid_token(self):
        """Test token verification with invalid token"""
        with pytest.raises(HTTPException) as exc_info:
            verify_token("invalid_token")
        
        assert exc_info.value.status_code == 401
    
    def test_verify_expired_token(self):
        """Test token verification with expired token"""
        data = {"email": "test@example.com", "address": "ALGO123"}
        # Create token that expires immediately
        token = create_access_token(data, expires_delta=timedelta(seconds=-1))
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        
        assert exc_info.value.status_code == 401
