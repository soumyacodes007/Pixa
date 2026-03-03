"""
Intermezzo Client Implementation

Based on reference: https://github.com/algorandfoundation/intermezzo

Intermezzo API endpoints:
- POST /v1/auth/sign-in/ - Authenticate with vault token
- GET /v1/wallet/manager/ - Get manager wallet address
- POST /v1/wallet/sign - Sign transaction
- GET /health - Health check (assumed)
"""

import httpx
from typing import Optional, Dict, Any
import base64
import logging

logger = logging.getLogger(__name__)


class IntermezzoClient:
    """Client for interacting with Intermezzo signing service"""
    
    def __init__(self, base_url: str, vault_token: Optional[str] = None):
        """
        Initialize Intermezzo client
        
        Args:
            base_url: Base URL of Intermezzo service (e.g., http://localhost:3000)
            vault_token: Vault authentication token (optional, can be set later)
        """
        self.base_url = base_url.rstrip('/')
        self.vault_token = vault_token
        self.access_token: Optional[str] = None
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check Intermezzo health status
        
        Returns:
            dict: Health status with 'status' and 'version' keys
        
        Raises:
            httpx.HTTPError: If connection fails
        """
        try:
            # Try common health check endpoints
            for endpoint in ['/health', '/v1/health', '/']:
                try:
                    response = await self.client.get(f"{self.base_url}{endpoint}")
                    if response.status_code == 200:
                        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                        return {
                            "status": "ok",
                            "version": data.get("version", "unknown"),
                            "endpoint": endpoint
                        }
                except Exception:
                    continue
            
            # If no endpoint works, raise error
            raise httpx.ConnectError(f"Could not connect to Intermezzo at {self.base_url}")
            
        except httpx.ConnectError as e:
            logger.error(f"Connection error: {e}")
            raise
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            raise
    
    async def authenticate(self, vault_token: Optional[str] = None) -> str:
        """
        Authenticate with Intermezzo using vault token
        
        Args:
            vault_token: Vault token (uses instance token if not provided)
        
        Returns:
            str: Access token for subsequent requests
        
        Raises:
            httpx.HTTPError: If authentication fails
        """
        token = vault_token or self.vault_token
        if not token:
            raise ValueError("Vault token required for authentication")
        
        try:
            response = await self.client.post(
                f"{self.base_url}/v1/auth/sign-in/",
                json={"vault_token": token}
            )
            response.raise_for_status()
            
            data = response.json()
            self.access_token = data.get("access_token")
            
            if not self.access_token:
                raise ValueError("No access_token in response")
            
            return self.access_token
            
        except httpx.HTTPError as e:
            logger.error(f"Authentication failed: {e}")
            raise
    
    async def create_wallet(self, user_id: str) -> Dict[str, Any]:
        """
        Create a new wallet in Vault
        
        Note: Based on Intermezzo docs, wallets are created automatically
        when accessing manager/user endpoints. This method gets the manager
        wallet address which is created during vault initialization.
        
        Args:
            user_id: User identifier
        
        Returns:
            dict: Wallet info with 'address' key
        
        Raises:
            httpx.HTTPError: If wallet creation fails
        """
        # Ensure we're authenticated
        if not self.access_token:
            await self.authenticate()
        
        try:
            # Get manager wallet address (created during vault init)
            response = await self.client.get(
                f"{self.base_url}/v1/wallet/manager/",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            
            data = response.json()
            address = data.get("address")
            
            if not address:
                raise ValueError("No address in response")
            
            # Validate Algorand address format (58 chars, base32)
            if len(address) != 58 or not address.isalnum() or not address.isupper():
                raise ValueError(f"Invalid Algorand address format: {address}")
            
            return {
                "address": address,
                "user_id": user_id,
                "created": True
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Wallet creation failed: {e}")
            raise
    
    async def sign_transaction(self, unsigned_tx: bytes, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sign a transaction using Vault-stored keys
        
        Args:
            unsigned_tx: Unsigned transaction bytes
            context: Context dict with user_id, request_id, etc.
        
        Returns:
            dict: Signed transaction with 'signed_transaction' and 'tx_id' keys
        
        Raises:
            httpx.HTTPError: If signing fails
        """
        # Ensure we're authenticated
        if not self.access_token:
            await self.authenticate()
        
        try:
            # Encode transaction to base64 for JSON transport
            encoded_tx = base64.b64encode(unsigned_tx).decode('utf-8')
            
            # Sign transaction via Intermezzo
            response = await self.client.post(
                f"{self.base_url}/v1/wallet/sign",
                headers={"Authorization": f"Bearer {self.access_token}"},
                json={
                    "transaction": encoded_tx,
                    "context": context
                }
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Decode signed transaction from base64
            signed_tx_b64 = data.get("signed_transaction")
            if not signed_tx_b64:
                raise ValueError("No signed_transaction in response")
            
            signed_tx = base64.b64decode(signed_tx_b64)
            
            return {
                "signed_transaction": signed_tx,
                "tx_id": data.get("tx_id", "unknown"),
                "context": context
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Transaction signing failed: {e}")
            raise
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
