import type { Tables, Enums } from "@/integrations/supabase/types";

// ── Enums ─────────────────────────────────────────────────────────────────────
// Extend generated enums with values not yet in the schema snapshot.

export type BookingStatus = Enums<"booking_status"> | "UNPROCESSED";
export type BookingSource = Enums<"booking_source"> | "AI";
export type AppRole       = Enums<"app_role">       | "viewer" | "owner";

// ── Types derived from the generated schema ───────────────────────────────────
// `Omit` is used only when the generated column type must be narrowed or
// replaced (e.g. `boolean | null` → `boolean`, or swapping an enum type).
// Columns that exist in the DB but are absent from the snapshot are appended
// as an intersection — they will move into the base type on the next
// `supabase gen types` run.

export type RoomType =
  Omit<Tables<"room_types">, "amenities" | "is_active" | "sort_order"> & {
    amenities: string[];         // snapshot: string[] | null — app treats as non-null
    is_active: boolean;          // snapshot: boolean | null  — app treats as non-null
    sort_order: number;          // snapshot: number | null   — app treats as non-null
    // not yet in snapshot
    name_uk: string | null;
    description_uk: string | null;
    short_description_uk: string | null;
    amenities_uk: string[] | null;
  };

export type RoomUnit =
  Omit<Tables<"room_units">, "is_active"> & {
    is_active: boolean;
    // not yet in snapshot
    cleanliness_status: "clean" | "dirty" | "under_renovation";
    bed_config: "double_bed" | "twin_beds" | "double_bed_sofa" | "triple_single" | "quad_single" | null;
    extra_accommodation_enabled: boolean;
    extra_accommodation_max: number;
    // optional join
    room_type?: RoomType;
  };

export type RoomMedia =
  Omit<Tables<"room_media">, "is_primary" | "sort_order"> & {
    is_primary: boolean;
    sort_order: number;
  };

export type HotelSettings =
  Tables<"hotel_settings"> & {
    // not yet in snapshot
    address_uk: string | null;
    tourist_tax_rate: number;
    total_capacity: number | null;
    extra_capacity: number | null;
  };

export type GuestForm =
  Omit<Tables<"guest_forms">, "ubk_discount_applied"> & {
    ubk_discount_applied: boolean;  // snapshot: boolean | null — app treats as non-null
    // not yet in snapshot
    guest_index: number;
  };

export type Profile =
  Omit<Tables<"profiles">, "commission_rate"> & {
    commission_rate: number;        // snapshot: number | null — app treats as non-null
    // not yet in snapshot
    commission_rate_manual: number;
    commission_rate_site: number;
  };

export type EventType =
  | "wedding" | "birthday" | "corporate" | "christening"
  | "anniversary" | "conference" | "kids_party";

export type Reservation =
  Omit<Tables<"reservations">, "status" | "booking_source" | "room_unit_id"> & {
    status: BookingStatus;
    booking_source: BookingSource;
    room_unit_id: string | null;       // nullable for banquet-type reservations
    // not yet in snapshot
    assigned_admin_id: string | null;
    deposit_amount: number | null;
    payment_method: string | null;
    tourist_tax_amount: number;
    early_checkin_fee: number;
    late_checkout_fee: number;
    booking_group_id: string | null;
    promotion_id: string | null;
    discount_percent: number;
    type: "room" | "banquet";
    event_type: EventType | null;
    guests_count: number | null;
    has_accommodation: boolean;
    has_menu: boolean;
    has_decor: boolean;
    has_music: boolean;
    budget: string | null;
    // optional join
    room_unit?: RoomUnit;
  };

// ── Tables not yet in the generated schema ────────────────────────────────────
// These will become Tables<"..."> derivations once `supabase gen types` is re-run.

export interface RoomTypeGuestPrice {
  id: string;
  room_type_id: string;
  guest_count: number;
  price_per_night: number;
  created_at: string;
}

export interface GroupCalculationService {
  id: string;
  calculation_id: string;
  service_name: string;
  cost: number | null;
  created_at: string;
}

export interface GroupCalculation {
  id: string;
  name: string;
  price_per_person_per_night: number;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
  services?: GroupCalculationService[];
}

export interface GroupBookingRoomAssignment {
  id: string;
  group_booking_id: string;
  room_unit_id: string;
  guest_names: string[];
  extra_guest_names: string[];
  ubd_documents: string[];
  early_checkin_fee: number;
  late_checkout_fee: number;
  extra_accommodation: number;
  check_in_override: string | null;
  check_out_override: string | null;
  room_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupBooking {
  id: string;
  booking_name: string;
  contact_person: string;
  phone: string | null;
  num_guests: number;
  room_unit_ids: string[];
  check_in_date: string;
  check_out_date: string;
  status: string;
  admin_notes: string | null;
  calculation_id: string | null;
  custom_total: number | null;
  total_price: number;
  deposit_amount?: number | null;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
  room_assignments?: Array<{
    room_unit_id: string;
    early_checkin_fee: number;
    late_checkout_fee: number;
    check_in_override: string | null;
    check_out_override: string | null;
  }>;
}

export type PromoApplicationStatus = "new" | "in_progress" | "resolved" | "declined";

export interface Promotion {
  id: string;
  title: string;
  title_uk: string | null;
  description: string | null;
  description_uk: string | null;
  badge: string | null;
  badge_uk: string | null;
  highlights: string[];
  highlights_uk: string[];
  discount_percent: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type GroupBookingRequestStatus = "new" | "in_progress" | "resolved" | "declined";

export interface GroupBookingRequest {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  num_guests: number;
  wishes: string | null;
  status: GroupBookingRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoApplication {
  id: string;
  promotion_id: string | null;
  promotion_title: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  comment: string | null;
  status: PromoApplicationStatus;
  admin_feedback: string | null;
  created_at: string;
  updated_at: string;
}
