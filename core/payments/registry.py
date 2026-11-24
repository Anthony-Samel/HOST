from django.conf import settings

from .bank_transfer import BankTransferProvider
from .base import BasePaymentProvider


class FutureGatewayStubProvider(BasePaymentProvider):
    """
    Drop-in slot for Monnify (Starter Business) or Flutterwave payment links.
    Implement initialize_payment() and verify_payment() when plugging in a live link provider.
    """

    def __init__(self, name: str) -> None:
        self.name = name

    def initialize_payment(self, **kwargs):
        raise NotImplementedError(
            f"Payment gateway '{self.name}' is registered as a swappable slot. "
            "Set HOST_PAYMENT_GATEWAY=bank_transfer or implement this provider."
        )

    def verify_payment(self, reference: str, payload=None):
        raise NotImplementedError(
            f"Payment gateway '{self.name}' verification is not yet wired."
        )


PROVIDERS: dict[str, BasePaymentProvider] = {
    "bank_transfer": BankTransferProvider(),
    "monnify": FutureGatewayStubProvider("monnify"),
    "flutterwave": FutureGatewayStubProvider("flutterwave"),
}


def get_payment_provider(gateway_name: str | None = None) -> BasePaymentProvider:
    chosen = (gateway_name or getattr(settings, "PAYMENT_GATEWAY_DEFAULT", "bank_transfer")).lower()
    return PROVIDERS.get(chosen, PROVIDERS["bank_transfer"])