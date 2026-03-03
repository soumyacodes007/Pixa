"""
OTP (One-Time Password) utilities
Cryptographically secure OTP generation and validation
"""
import secrets
import bcrypt as bcrypt_lib


def generate_otp(length: int = 6) -> str:
    """
    Generate a cryptographically secure OTP code
    
    Args:
        length: Length of OTP (default 6 digits)
    
    Returns:
        str: OTP code (e.g., "123456")
    """
    # Use secrets module for cryptographically secure random numbers
    # Generate a number between 0 and 10^length - 1
    max_value = 10 ** length - 1
    otp_number = secrets.randbelow(max_value + 1)
    
    # Format with leading zeros
    otp_code = str(otp_number).zfill(length)
    
    return otp_code


def hash_otp(otp: str) -> str:
    """
    Hash OTP using bcrypt
    
    Args:
        otp: Plain OTP code
    
    Returns:
        str: Bcrypt hash of OTP
    """
    # Convert string to bytes and hash with bcrypt
    otp_bytes = otp.encode('utf-8')
    salt = bcrypt_lib.gensalt()
    hashed = bcrypt_lib.hashpw(otp_bytes, salt)
    return hashed.decode('utf-8')


def verify_otp(otp: str, otp_hash: str) -> bool:
    """
    Verify OTP against hash
    
    Args:
        otp: Plain OTP code to verify
        otp_hash: Bcrypt hash to verify against
    
    Returns:
        bool: True if OTP matches hash
    """
    try:
        otp_bytes = otp.encode('utf-8')
        hash_bytes = otp_hash.encode('utf-8')
        return bcrypt_lib.checkpw(otp_bytes, hash_bytes)
    except Exception:
        return False


def generate_flow_id() -> str:
    """
    Generate a unique flow ID for authentication flow
    
    Returns:
        str: Unique flow ID (e.g., "flow_abc123def456")
    """
    # Generate 16 random bytes and convert to hex
    random_bytes = secrets.token_bytes(16)
    hex_string = random_bytes.hex()
    
    return f"flow_{hex_string}"
