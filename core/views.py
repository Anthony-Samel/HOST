import secrets
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    AccessCode,
    Event,
    GuestRegistration,
    HostProfile,
    Venue,
    VenueBooking,
)
from .payments import get_payment_provider
from .permissions import IsEventHostOrReadOnly
from .serializers import (
    AccessCodeSerializer,
    EventSerializer,
    GuestRegistrationSerializer,
    HostProfileSerializer,
    RegisterHostSerializer,
    VenueBookingSerializer,
    VenueSerializer,
)


def _generate_unique_access_code(event_id: int) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        suffix = "".join(secrets.choice(alphabet) for _ in range(6))
        candidate = f"E{event_id}-{suffix}"
        if not AccessCode.objects.filter(code=candidate).exists():
            return candidate


def _issue_access_codes_for_registration(registration: GuestRegistration) -> None:
    existing_count = registration.access_codes.count()
    needed = max(0, registration.guest_slots - existing_count)
    for idx in range(needed):
        AccessCode.objects.create(
            registration=registration,
            event=registration.event,
            slot_number=existing_count + idx + 1,
            code=_generate_unique_access_code(registration.event_id),
        )

class ApiRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "service": "Host API",
                "endpoints": {
                    "events": request.build_absolute_uri("/api/events/"),
                    "venues": request.build_absolute_uri("/api/venues/"),
                    "host_register": request.build_absolute_uri("/api/auth/register/"),
                    "host_login": request.build_absolute_uri("/api/auth/login/"),
                    "admin": request.build_absolute_uri("/admin/"),
                },
            }
        )

class RegisterHostView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterHostSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "profile": HostProfileSerializer(user.host_profile).data,
            },
            status=status.HTTP_201_CREATED,
        )


class HostLoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class HostMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = HostProfile.objects.get_or_create(
            user=request.user,
            defaults={"display_name": request.user.username},
        )
        return Response(HostProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = HostProfile.objects.get_or_create(
            user=request.user,
            defaults={"display_name": request.user.username},
        )
        serializer = HostProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class VenueListCreateView(generics.ListCreateAPIView):
    serializer_class = VenueSerializer

    def get_queryset(self):
        return Venue.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class VenueBookingCreateView(generics.CreateAPIView):
    serializer_class = VenueBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(booked_by=self.request.user, status="confirmed")


class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsEventHostOrReadOnly]

    def get_queryset(self):
        queryset = Event.objects.prefetch_related("ticket_categories").select_related("booked_venue")
        if self.request.query_params.get("mine") == "true" and self.request.user.is_authenticated:
            return queryset.filter(host=self.request.user)
        return queryset.filter(status="published")


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.prefetch_related("ticket_categories").select_related("booked_venue")
    serializer_class = EventSerializer
    permission_classes = [IsEventHostOrReadOnly]
    lookup_field = "slug"


class GuestRegistrationCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        event = get_object_or_404(Event, slug=slug, status="published")
        serializer = GuestRegistrationSerializer(data={**request.data, "event": event.id})
        serializer.is_valid(raise_exception=True)

        ticket_cat = serializer.validated_data.get("ticket_category")
        if ticket_cat and ticket_cat.event_id != event.id:
            return Response(
                {"detail": "Ticket category does not belong to this event."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            reg = serializer.save(event=event)
            if event.is_free or reg.total_amount <= 0:
                reg.status = "confirmed"
                reg.confirmed_at = timezone.now()
                reg.save(update_fields=["status", "confirmed_at"])
                _issue_access_codes_for_registration(reg)
                payment_info = None
            else:
                provider = get_payment_provider()
                reg.payment_provider = provider.name
                reg.status = "pending_payment"
                reg.save(update_fields=["payment_provider", "status"])
                init_res = provider.initialize_payment(
                    reference=reg.reference,
                    amount=reg.total_amount,
                    currency="NGN",
                    customer_name=reg.full_name,
                    customer_email=reg.email,
                    customer_phone=reg.phone,
                    event_title=event.title,
                    bank_details={
                        "bank_name": event.bank_name,
                        "account_number": event.account_number,
                        "account_name": event.account_name,
                    },
                )
                payment_info = init_res.instructions

        data = GuestRegistrationSerializer(reg).data
        data["payment_instructions"] = payment_info
        return Response(data, status=status.HTTP_201_CREATED)


class UploadPaymentProofView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, reference):
        reg = get_object_or_404(GuestRegistration, reference=reference)
        proof_file = request.FILES.get("payment_proof")
        note = request.data.get("payment_note", "")

        if not proof_file:
            return Response({"detail": "Please attach a payment proof image."}, status=status.HTTP_400_BAD_REQUEST)

        reg.payment_proof = proof_file
        reg.payment_note = note
        reg.status = "proof_submitted"
        reg.save(update_fields=["payment_proof", "payment_note", "status"])
        return Response(GuestRegistrationSerializer(reg).data)


class GuestRegistrationLookupView(generics.RetrieveAPIView):
    queryset = GuestRegistration.objects.prefetch_related("access_codes")
    serializer_class = GuestRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "reference"


class HostConfirmRegistrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reg_id):
        reg = get_object_or_404(GuestRegistration, pk=reg_id, event__host=request.user)
        action = request.data.get("action", "confirm")

        if action == "reject":
            reg.status = "rejected"
            reg.save(update_fields=["status"])
            return Response(GuestRegistrationSerializer(reg).data)

        provider = get_payment_provider(reg.payment_provider)
        if reg.total_amount > 0 and reg.payment_provider == "bank_transfer":
            provider.verify_payment(reg.reference, {"host_confirmed": True})

        with transaction.atomic():
            reg.status = "confirmed"
            reg.confirmed_at = timezone.now()
            reg.save(update_fields=["status", "confirmed_at"])
            _issue_access_codes_for_registration(reg)

        return Response(GuestRegistrationSerializer(reg).data)


class HostEventRegistrationsView(generics.ListAPIView):
    serializer_class = GuestRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event_id = self.kwargs["event_id"]
        return GuestRegistration.objects.filter(
            event_id=event_id,
            event__host=self.request.user,
        ).prefetch_related("access_codes")


class EventAccessCodesListView(generics.ListAPIView):
    """Returns all issued access codes for an event owned by the host (printable guest list)."""
    serializer_class = AccessCodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AccessCode.objects.filter(
            event_id=self.kwargs["event_id"],
            event__host=self.request.user,
            registration__status="confirmed",
        ).select_related("registration", "registration__ticket_category", "event")


class EventGateManifestView(APIView):
    """Downloads a compact offline gate manifest of confirmed access codes for local browser caching."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        event = get_object_or_404(Event, pk=event_id, host=request.user)
        codes = AccessCode.objects.filter(
            event=event,
            registration__status="confirmed",
        ).select_related("registration", "registration__ticket_category")

        return Response(
            {
                "event_id": event.id,
                "event_title": event.title,
                "synced_at": timezone.now().isoformat(),
                "codes": AccessCodeSerializer(codes, many=True).data,
            }
        )


class VerifyAccessCodeView(APIView):
    """
    Verifies a single-use access code by QR scan or manual typing/search.
    Uses select_for_update() inside an atomic block to prevent double-entry races.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw_code = (request.data.get("code") or "").strip().upper()
        event_id = request.data.get("event_id")

        if not raw_code:
            return Response({"valid": False, "reason": "Enter or scan an access code."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            qs = AccessCode.objects.select_for_update().select_related(
                "event", "registration", "registration__ticket_category"
            ).filter(code=raw_code)
            if event_id:
                qs = qs.filter(event_id=event_id)

            access_code = qs.first()
            if not access_code:
                return Response({"valid": False, "reason": "Code not found."}, status=status.HTTP_404_NOT_FOUND)

            if access_code.event.host_id != request.user.id:
                return Response({"valid": False, "reason": "Code belongs to another host's event."}, status=status.HTTP_403_FORBIDDEN)

            if access_code.registration.status != "confirmed":
                return Response({"valid": False, "reason": "Guest registration is not confirmed yet."}, status=status.HTTP_400_BAD_REQUEST)

            if access_code.is_used:
                return Response(
                    {
                        "valid": False,
                        "already_used": True,
                        "reason": "Code already used for entry.",
                        "used_at": access_code.used_at,
                        "code": AccessCodeSerializer(access_code).data,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            access_code.mark_used(request.user)
            return Response(
                {
                    "valid": True,
                    "already_used": False,
                    "reason": "Entry approved.",
                    "code": AccessCodeSerializer(access_code).data,
                },
                status=status.HTTP_200_OK,
            )


class SyncOfflineCheckinsView(APIView):
    """
    Reconciles offline check-ins recorded while the host's device had no internet connection.
    Expects: { "checkins": [ { "code": "E1-ABC123", "checked_in_at": "2026-11-23T21:10:00Z" } ] }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get("checkins")
        if not isinstance(items, list):
            return Response({"detail": "checkins must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        with transaction.atomic():
            for entry in items:
                code_str = (entry.get("code") or "").strip().upper()
                if not code_str:
                    continue

                access_code = (
                    AccessCode.objects.select_for_update()
                    .select_related("event", "registration")
                    .filter(code=code_str, event__host=request.user)
                    .first()
                )
                if not access_code:
                    results.append({"code": code_str, "status": "not_found"})
                    continue

                if access_code.registration.status != "confirmed":
                    results.append({"code": code_str, "status": "unconfirmed"})
                    continue

                if access_code.is_used:
                    results.append(
                        {
                            "code": code_str,
                            "status": "already_used",
                            "used_at": access_code.used_at,
                        }
                    )
                    continue

                parsed_ts = parse_datetime(entry.get("checked_in_at") or "") or timezone.now()
                access_code.is_used = True
                access_code.used_at = parsed_ts
                access_code.checked_in_by = request.user
                access_code.save(update_fields=["is_used", "used_at", "checked_in_by"])
                results.append({"code": code_str, "status": "synced", "used_at": access_code.used_at})

        return Response({"results": results}, status=status.HTTP_200_OK)