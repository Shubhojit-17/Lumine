# AgentPay-USDCx TXID Store
"""
Thread-safe in-memory store for consumed TXIDs.
Single-use enforcement: each TXID can only be used once.
"""

import threading
from typing import Set


class TxidStore:
    """
    Thread-safe in-memory store for consumed transaction IDs.
    
    Not persistent across restarts (MVP requirement).
    """
    
    def __init__(self):
        self._consumed: Set[str] = set()
        self._lock = threading.Lock()
    
    def is_consumed(self, txid: str) -> bool:
        """Check if a TXID has already been used."""
        normalized = self._normalize(txid)
        with self._lock:
            return normalized in self._consumed
    
    def mark_consumed(self, txid: str) -> bool:
        """
        Mark a TXID as consumed.
        
        Returns:
            True if successfully marked (was not consumed).
            False if already consumed.
        """
        normalized = self._normalize(txid)
        with self._lock:
            if normalized in self._consumed:
                return False
            self._consumed.add(normalized)
            return True
    
    def _normalize(self, txid: str) -> str:
        """Normalize TXID to lowercase with 0x prefix."""
        txid = txid.strip().lower()
        if not txid.startswith("0x"):
            txid = f"0x{txid}"
        return txid
    
    def count(self) -> int:
        """Get count of consumed TXIDs."""
        with self._lock:
            return len(self._consumed)
    
    def clear(self) -> None:
        """Clear all consumed TXIDs (for testing only)."""
        with self._lock:
            self._consumed.clear()


# Global singleton instance
txid_store = TxidStore()
