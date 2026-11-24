export interface TicketCategory {
  id: number;
  kind: "regular" | "duo" | "family" | "vip" | "custom";
  name: string;
  price: string;
  guests_per_ticket: number;
  quota: number;
  description: string;
}

export interface EventItem {
  id: number;
  host: number;
  hosted_by_label: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  flyer: string | null;
  location_label: string;
  location_address: string;
  map_url: string;
  booked_venue: number | null;
  booked_venue_name: string | null;
  start_at: string;
  end_at: string | null;
  capacity: number;
  is_free: boolean;
  status: "published" | "draft" | "closed";
  bank_name: string;
  account_number: string;
  account_name: string;
  ticket_categories: TicketCategory[];
  created_at: string;
}

export interface VenueItem {
  id: number;
  name: string;
  campus_or_area: string;
  address: string;
  map_url: string;
  capacity: number;
  booking_fee: string;
  description: string;
  photo: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AccessCodeItem {
  id: number;
  event_id: number;
  slot_number: number;
  code: string;
  is_used: boolean;
  used_at: string | null;
  event_title: string;
  guest_name: string;
  guest_phone: string;
  registration_reference: string;
  ticket_label: string;
}

export interface GuestRegistrationItem {
  id: number;
  event: number;
  event_title: string;
  ticket_category: number | null;
  ticket_category_name: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string;
  quantity: number;
  guest_slots: number;
  total_amount: string;
  payment_provider: string;
  payment_proof: string | null;
  payment_note: string;
  status: "applied" | "pending_payment" | "proof_submitted" | "confirmed" | "rejected";
  created_at: string;
  confirmed_at: string | null;
  access_codes: AccessCodeItem[];
  payment_instructions?: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    amount?: string;
    currency?: string;
    reference?: string;
    note?: string;
  } | null;
}

export interface HostProfileData {
  id: number;
  username: string;
  email: string;
  display_name: string;
  host_type: "individual" | "group";
  group_name: string;
  phone_number: string;
  bio: string;
  default_bank_name: string;
  default_account_number: string;
  default_account_name: string;
}