from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    EventAccessCodesListView,
    EventDetailView,
    EventGateManifestView,
    EventListCreateView,
    GuestRegistrationCreateView,
    GuestRegistrationLookupView,
    HostConfirmRegistrationView,
    HostEventRegistrationsView,
    HostLoginView,
    HostMeView,
    RegisterHostView,
    SyncOfflineCheckinsView,
    UploadPaymentProofView,
    VenueBookingCreateView,
    VenueListCreateView,
    VerifyAccessCodeView,
    ApiRootView,
)

urlpatterns = [
    #ApiRootView
    path("", ApiRootView.as_view(), name="api-root"),
    
    # Host Auth & Profile
    path("auth/register/", RegisterHostView.as_view(), name="host-register"),
    path("auth/login/", HostLoginView.as_view(), name="host-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", HostMeView.as_view(), name="host-me"),

    # Venues & Bookings
    path("venues/", VenueListCreateView.as_view(), name="venue-list-create"),
    path("venues/book/", VenueBookingCreateView.as_view(), name="venue-book"),

    # Events
    path("events/", EventListCreateView.as_view(), name="event-list-create"),
    path("events/<slug:slug>/", EventDetailView.as_view(), name="event-detail"),

    # Guest Registration, Payment Proof & Code Lookup (No guest signup required)
    path("events/<slug:slug>/register/", GuestRegistrationCreateView.as_view(), name="guest-register"),
    path("registrations/<str:reference>/", GuestRegistrationLookupView.as_view(), name="registration-lookup"),
    path("registrations/<str:reference>/proof/", UploadPaymentProofView.as_view(), name="upload-payment-proof"),

    # Host Approvals, Printable Access Code Sheet, Offline Manifest & Entry Verification
    path("registrations/<int:reg_id>/decision/", HostConfirmRegistrationView.as_view(), name="host-registration-decision"),
    path("events/<int:event_id>/registrations/", HostEventRegistrationsView.as_view(), name="host-event-registrations"),
    path("events/<int:event_id>/access-codes/", EventAccessCodesListView.as_view(), name="event-access-codes"),
    path("events/<int:event_id>/gate-manifest/", EventGateManifestView.as_view(), name="event-gate-manifest"),
    path("access-codes/verify/", VerifyAccessCodeView.as_view(), name="verify-access-code"),
    path("access-codes/sync-checkins/", SyncOfflineCheckinsView.as_view(), name="sync-offline-checkins"),
]