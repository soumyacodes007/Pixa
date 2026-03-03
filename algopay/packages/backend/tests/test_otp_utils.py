"""
Tests for OTP utilities
Following TDD: Write tests first
"""
import pytest
from src.otp_utils import generate_otp, hash_otp, verify_otp, generate_flow_id


class TestOTPGeneration:
    """Test OTP generation"""
    
    def test_generate_otp_default_length(self):
        """Test OTP generation with default length (6 digits)"""
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()
    
    def test_generate_otp_custom_length(self):
        """Test OTP generation with custom length"""
        otp = generate_otp(length=8)
        assert len(otp) == 8
        assert otp.isdigit()
    
    def test_generate_otp_uniqueness(self):
        """Test that generated OTPs are unique"""
        otps = [generate_otp() for _ in range(100)]
        # Should have high uniqueness (allow some duplicates due to randomness)
        unique_otps = set(otps)
        assert len(unique_otps) > 90  # At least 90% unique
    
    def test_generate_otp_leading_zeros(self):
        """Test that OTPs can have leading zeros"""
        # Generate many OTPs and check if any start with 0
        otps = [generate_otp() for _ in range(1000)]
        has_leading_zero = any(otp.startswith('0') for otp in otps)
        assert has_leading_zero  # Should have at least one with leading zero


class TestOTPHashing:
    """Test OTP hashing and verification"""
    
    def test_hash_otp(self):
        """Test OTP hashing"""
        otp = "123456"
        otp_hash = hash_otp(otp)
        
        assert otp_hash is not None
        assert len(otp_hash) > 0
        assert otp_hash != otp  # Hash should be different from plain OTP
        assert otp_hash.startswith('$2b$')  # Bcrypt hash format
    
    def test_verify_otp_correct(self):
        """Test OTP verification with correct OTP"""
        otp = "123456"
        otp_hash = hash_otp(otp)
        
        assert verify_otp(otp, otp_hash) is True
    
    def test_verify_otp_incorrect(self):
        """Test OTP verification with incorrect OTP"""
        otp = "123456"
        otp_hash = hash_otp(otp)
        
        assert verify_otp("654321", otp_hash) is False
    
    def test_verify_otp_invalid_hash(self):
        """Test OTP verification with invalid hash"""
        assert verify_otp("123456", "invalid_hash") is False
    
    def test_hash_otp_different_each_time(self):
        """Test that hashing same OTP produces different hashes (salt)"""
        otp = "123456"
        hash1 = hash_otp(otp)
        hash2 = hash_otp(otp)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        
        # But both should verify correctly
        assert verify_otp(otp, hash1) is True
        assert verify_otp(otp, hash2) is True


class TestFlowIDGeneration:
    """Test flow ID generation"""
    
    def test_generate_flow_id_format(self):
        """Test flow ID format"""
        flow_id = generate_flow_id()
        
        assert flow_id.startswith('flow_')
        assert len(flow_id) == 37  # "flow_" (5) + 32 hex chars
        
        # Check hex part
        hex_part = flow_id[5:]
        assert all(c in '0123456789abcdef' for c in hex_part)
    
    def test_generate_flow_id_uniqueness(self):
        """Test that generated flow IDs are unique"""
        flow_ids = [generate_flow_id() for _ in range(100)]
        unique_ids = set(flow_ids)
        
        # All should be unique
        assert len(unique_ids) == 100
