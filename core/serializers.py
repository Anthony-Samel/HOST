from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    AccessCode,
    Event,
    GuestRegistration,
    HostProfile,
    TicketCategory,
    Venue,
    VenueBooking,
)

User = get_user_model()


class HostProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = HostProfile
        fields = [
            "id",
            "username",
            "email",
            "display_name",
            "host_type",
            "group_name",
            "phone_number",
            "bio",
            "default_bank_name",
            "default_account_number",
            "default_account_name",
            "created_at",
        ]


class RegisterHostSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(max_length=140)
    host_type = serializers.ChoiceField(choices=["individual", "group"], default="individual")
    group_name = serializers.CharField(max_length=140, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    default_bank_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    default_account_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    default_account_name = serializers.CharField(max_length=140, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        HostProfile.objects.create(
            user=user,
            display_name=validated_data["display_name"],
            host_type=validated_data.get("host_type", "individual"),
            group_name=validated_data.get("group_name", ""),
            phone_number=validated_data.get("phone_number", ""),
            default_bank_name=validated_data.get("default_bank_name", ""),
            default_account_number=validated_data.get("default_account_number", ""),
            default_account_name=validated_data.get("default_account_name", ""),
        )
        return user


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = [
            "id",
            "name",
            "campus_or_area",
            "address",
            "map_url",
            "capacity",
            "booking_fee",
            "description",
            "photo",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class VenueBookingSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source="venue.name", read_only=True)

    class Meta:
        model = VenueBooking
        fields = [
            "id",
            "venue",
            "venue_name",
            "event",
            "booking_date",
            "notes",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]


class TicketCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketCategory
        fields = [
            "id",
            "kind",
            "name",
            "price",
            "guests_per_ticket",
            "quota",
            "description",
        ]


class EventSerializer(serializers.ModelSerializer):
    ticket_categories = TicketCategorySerializer(many=True, required=False)
    booked_venue_name = serializers.CharField(source="booked_venue.name", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "host",
            "hosted_by_label",
            "title",
            "slug",
            "category",
            "description",
            "flyer",
            "location_label",
            "location_address",
            "map_url",
            "booked_venue",
            "booked_venue_name",
            "start_at",
            "end_at",
            "capacity",
            "is_free",
            "status",
            "bank_name",
            "account_number",
            "account_name",
            "ticket_categories",
            "created_at",
        ]
        read_only_fields = ["host", "slug", "created_at"]

    def create(self, validated_data):
        categories_data = validated_data.pop("ticket_categories", [])
        request = self.context.get("request")
        host_user = request.user
        profile = getattr(host_user, "host_profile", None)

        if not validated_data.get("hosted_by_label"):
            if profile:
                validated_data["hosted_by_label"] = (
                    profile.group_name if profile.host_type == "group" and profile.group_name else profile.display_name
                )
            else:
                validated_data["hosted_by_label"] = host_user.username

        if profile and not validated_data.get("is_free"):
            validated_data["bank_name"] = validated_data.get("bank_name") or profile.default_bank_name
            validated_data["account_number"] = validated_data.get("account_number") or profile.default_account_number
            validated_data["account_name"] = validated_data.get("account_name") or profile.default_account_name

        event = Event.objects.create(host=host_user, **validated_data)

        for cat in categories_data:
            TicketCategory.objects.create(event=event, **cat)

        if not categories_data:
            TicketCategory.objects.create(
                event=event,
                kind="regular",
                name="Regular Admission" if event.is_free else "Regular",
                price=0 if event.is_free else 1000,
                guests_per_ticket=1,
                quota=event.capacity,
            )

        return event


class AccessCodeSerializer(serializers.ModelSerializer):
    event_id = serializers.IntegerField(source="event.id", read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)
    guest_name = serializers.CharField(source="registration.full_name", read_only=True)
    guest_phone = serializers.CharField(source="registration.phone", read_only=True)
    registration_reference = serializers.CharField(source="registration.reference", read_only=True)
    ticket_label = serializers.CharField(source="registration.ticket_category.name", read_only=True, default="Admission")

    class Meta:
        model = AccessCode
        fields = [
            "id",
            "event_id",
            "slot_number",
            "code",
            "is_used",
            "used_at",
            "event_title",
            "guest_name",
            "guest_phone",
            "registration_reference",
            "ticket_label",
        ]


class GuestRegistrationSerializer(serializers.ModelSerializer):
    access_codes = serializers.SerializerMethodField()
    event_title = serializers.CharField(source="event.title", read_only=True)
    ticket_category_name = serializers.CharField(source="ticket_category.name", read_only=True, default="Standard")

    class Meta:
        model = GuestRegistration
        fields = [
            "id",
            "event",
            "event_title",
            "ticket_category",
            "ticket_category_name",
            "reference",
            "full_name",
            "email",
            "phone",
            "quantity",
            "guest_slots",
            "total_amount",
            "payment_provider",
            "payment_proof",
            "payment_note",
            "status",
            "created_at",
            "confirmed_at",
            "access_codes",
        ]
        read_only_fields = [
            "reference",
            "guest_slots",
            "total_amount",
            "payment_provider",
            "status",
            "created_at",
            "confirmed_at",
            "access_codes",
        ]

    def get_access_codes(self, obj):
        if obj.status != "confirmed":
            return []
        return AccessCodeSerializer(obj.access_codes.all(), many=True).data