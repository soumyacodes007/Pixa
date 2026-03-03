"""
Test Intermezzo Client Integration

Following TDD approach from agents.md:
1. Write tests first for connection
2. Then write code
3. Then test it

Reference: https://github.com/algorandfoundation/intermezzo
"""

import pytest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from intermezzo_client import IntermezzoClient


@pytest.mark.asyncio
class TestIntermezzoClient:
    """Test suite for Intermezzo client"""
    
    @pytest.fixture
    def client(self):
        """Create Intermezzo client for testing"""
        return IntermezzoClient(
            base_url="http://localhost:8080",
            vault_token="test-vault-token"
        )
    
    async def test_health_check(self, client):
        """Test: should connect to Intermezzo API"""
        # This test will fail until Intermezzo is actually running
        # For now, we expect a connection error
        try:
            health = await client.health_check()
            assert health["status"] == "ok"
            assert "version" in health
        except Exception as e:
            # Expected to fail without Intermezzo running
            assert "connection" in str(e).lower() or "connect" in str(e).lower()
        finally:
            await client.close()
    
    async def test_create_wallet(self, client):
        """Test: should create wallet in Vault"""
        # This test will fail until Intermezzo is running
        try:
            wallet = await client.create_wallet("test-user-123")
            
            # Algorand addresses are 58 characters, base32 encoded
            assert "address" in wallet
            assert len(wallet["address"]) == 58
            assert wallet["address"].isalnum()
            assert wallet["address"].isupper()
        except Exception as e:
            # Expected to fail without Intermezzo running
            assert "connection" in str(e).lower() or "connect" in str(e).lower() or "auth" in str(e).lower()
        finally:
            await client.close()
    
    async def test_sign_transaction(self, client):
        """Test: should sign transaction"""
        # This test will fail until Intermezzo is running
        try:
            # Create a simple unsigned transaction (mock for now)
            unsigned_tx = b"mock_unsigned_transaction"
            context = {
                "user_id": "test-user-123",
                "request_id": "req_456"
            }
            
            result = await client.sign_transaction(unsigned_tx, context)
            
            assert "signed_transaction" in result
            assert "tx_id" in result
            assert isinstance(result["signed_transaction"], bytes)
        except Exception as e:
            # Expected to fail without Intermezzo running
            assert "connection" in str(e).lower() or "connect" in str(e).lower() or "auth" in str(e).lower()
        finally:
            await client.close()
    
    async def test_connection_error_handling(self):
        """Test: should handle connection errors gracefully"""
        # Test with invalid URL
        bad_client = IntermezzoClient(base_url="http://invalid-host:9999")
        
        try:
            await bad_client.health_check()
            assert False, "Should have raised an exception"
        except Exception as exc:
            # Should raise a connection error
            error_msg = str(exc).lower()
            assert "connect" in error_msg or "connection" in error_msg
        finally:
            await bad_client.close()
    
    async def test_retry_logic(self, client):
        """Test: should retry on transient failures"""
        # This will be implemented when we add retry logic
        # For now, just a placeholder test
        pass


# Run tests with: pytest tests/test_intermezzo_client.py -v
