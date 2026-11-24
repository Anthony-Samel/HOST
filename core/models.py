from decimal import Decimal
import secrets
import string
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def generate_reference_code(prefix: str = "HST", length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    token = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}-{token}"


class HostProfile(models.Model):
    HOST_TYPE_CHOICES = [
        ("individual", "Individual"),
        ("group", "Group / Collective"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="host_profile")
    display_name = models.CharField(max_length=140)
    host_type = models.CharField(max_length=20, choices=HOST_TYPE_CHOICES, default="individual")
    group_name = models.CharField(max_length=140, blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    bio = models.TextField(blank=True)
    default_bank_name = models.CharField(max_length=100, blank=True)
    default_account_number = models.CharField(max_length=30, blank=True)
    default_account_name = models.CharField(max_length=140, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.display_name or self.user.username


class Venue(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_venues",
    )
    name = models.CharField(max_length=160)
    campus_or_area = models.CharField(max_length=160)
    address = models.CharField(max_length=255)
    map_url = models.URLField(blank=True)
    capacity = models.PositiveIntegerField(default=50)
    booking_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="venue_photos/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.campus_or_area})"


class Event(models.Model):
    STATUS_CHOICES = [
        ("published", "Published"),
        ("draft", "Draft"),
        ("closed", "Closed"),
    ]

    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hosted_events")
    hosted_by_label = models.CharField(max_length=160)
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=210, unique=True, blank=True)
    category = models.CharField(max_length=80, default="Party")
    description = models.TextField()
    flyer = models.ImageField(upload_to="event_flyers/", blank=True, null=True)

    # Traceable location (house, spot, or booked venue) + map link
    location_label = models.CharField(max_length=200)
    location_address = models.CharField(max_length=255)
    map_url = models.URLField(blank=True)
    booked_venue = models.ForeignKey(Venue, on_delete=models.SET_NULL, null=True, blank=True, related_name="events")

    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    capacity = models.PositiveIntegerField(default=100)
    is_free = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="published")

    # Host bank details for bank transfer tickets
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=30, blank=True)
    account_name = models.CharField(max_length=140, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or "event"
            candidate = base
            counter = 1
            while Event.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                counter += 1
                candidate = f"{base}-{counter}"
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class TicketCategory(models.Model):
    KIND_CHOICES = [
        ("regular", "Regular"),
        ("duo", "Duo"),
        ("family", "Family"),
        ("vip", "VIP"),
        ("custom", "Custom"),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="ticket_categories")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="regular")
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    guests_per_ticket = models.PositiveIntegerField(default=1)
    quota = models.PositiveIntegerField(default=50)
    description = models.CharField(max_length=240, blank=True)

    class Meta:
        ordering = ["price", "id"]

    def __str__(self) -> str:
        return f"{self.event.title} - {self.name}"


class VenueBooking(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
    ]

    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="bookings")
    event = models.OneToOneField(Event, on_delete=models.SET_NULL, null=True, blank=True, related_name="venue_booking")
    booked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="venue_bookings")
    booking_date = models.DateField()
    notes = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="confirmed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.venue.name} on {self.booking_date}"


class GuestRegistration(models.Model):
    STATUS_CHOICES = [
        ("applied", "Applied"),              # Free event application awaiting host approval
        ("pending_payment", "Pending Payment"),
        ("proof_submitted", "Proof Submitted"),
        ("confirmed", "Confirmed"),          # Access codes released
        ("rejected", "Rejected"),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    ticket_category = models.ForeignKey(
        TicketCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registrations",
    )
    reference = models.CharField(max_length=32, unique=True, blank=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    quantity = models.PositiveIntegerField(default=1)  # Number of tickets purchased/applied for
    guest_slots = models.PositiveIntegerField(default=1)  # quantity * guests_per_ticket
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    payment_provider = models.CharField(max_length=40, default="bank_transfer")
    payment_proof = models.ImageField(upload_to="payment_proofs/", blank=True, null=True)
    payment_note = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="applied")
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.reference:
            ref = generate_reference_code("HST", 8)
            while GuestRegistration.objects.filter(reference=ref).exists():
                ref = generate_reference_code("HST", 8)
            self.reference = ref
        if self.ticket_category:
            self.guest_slots = max(1, self.quantity * self.ticket_category.guests_per_ticket)
            if self.event.is_free:
                self.total_amount = Decimal("0.00")
            else:
                self.total_amount = self.ticket_category.price * self.quantity
        else:
            self.guest_slots = max(1, self.quantity)
            if self.event.is_free:
                self.total_amount = Decimal("0.00")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.reference} - {self.full_name}"


class AccessCode(models.Model):
    registration = models.ForeignKey(GuestRegistration, on_delete=models.CASCADE, related_name="access_codes")
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="access_codes")
    slot_number = models.PositiveIntegerField(default=1)
    code = models.CharField(max_length=24, unique=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_access_codes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["slot_number", "id"]

    def mark_used(self, scanner_user=None):
        if self.is_used:
            return False
        self.is_used = True
        self.used_at = timezone.now()
        if scanner_user and scanner_user.is_authenticated:
            self.checked_in_by = scanner_user
        self.save(update_fields=["is_used", "used_at", "checked_in_by"])
        return True

    def __str__(self) -> str:
        return self.code