from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class PaymentInitResult:
    provider: str
    reference: str
    status: str  # "pending_proof", "pending_gateway", "paid", "failed"
    checkout_url: str | None = None
    instructions: dict[str, Any] | None = None


@dataclass
class PaymentVerifyResult:
    paid: bool
    provider: str
    reference: str
    raw_status: str


class BasePaymentProvider(ABC):
    name: str = "base"

    @abstractmethod
    def initialize_payment(
        self,
        *,
        reference: str,
        amount: Decimal,
        currency: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        event_title: str,
        bank_details: dict[str, str] | None = None,
    ) -> PaymentInitResult:
        """Start a payment session or return manual bank transfer instructions."""

    @abstractmethod
    def verify_payment(self, reference: str, payload: dict[str, Any] | None = None) -> PaymentVerifyResult:
        """Verify whether payment has been settled."""