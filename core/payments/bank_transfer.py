from decimal import Decimal
from typing import Any

from .base import BasePaymentProvider, PaymentInitResult, PaymentVerifyResult


class BankTransferProvider(BasePaymentProvider):
    name = "bank_transfer"

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
        details = bank_details or {}
        return PaymentInitResult(
            provider=self.name,
            reference=reference,
            status="pending_proof",
            checkout_url=None,
            instructions={
                "bank_name": details.get("bank_name", ""),
                "account_number": details.get("account_number", ""),
                "account_name": details.get("account_name", ""),
                "amount": str(amount),
                "currency": currency,
                "reference": reference,
                "note": f"Include reference {reference} in transfer narration, then upload proof.",
            },
        )

    def verify_payment(self, reference: str, payload: dict[str, Any] | None = None) -> PaymentVerifyResult:
        # Bank transfer settlement is confirmed explicitly by the event host after reviewing proof.
        approved = bool(payload and payload.get("host_confirmed") is True)
        return PaymentVerifyResult(
            paid=approved,
            provider=self.name,
            reference=reference,
            raw_status="confirmed" if approved else "pending_host_confirmation",
        )