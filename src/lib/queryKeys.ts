/**
 * Centralized React Query key factory.
 *
 * Use these instead of bare string arrays so that a typo in an
 * invalidateQueries call is caught at compile time rather than silently
 * producing stale data.
 *
 * Functions with optional parameters return the namespace prefix when called
 * with no arguments.  React Query prefix-matches on invalidation, so e.g.
 * QK.guestForm() invalidates every ["guest-form", *] query at once.
 */
export const QK = {
  // ── Auth / User ─────────────────────────────────────────────────────────
  userRole: () => ["user-role"] as const,
  currentUserId: () => ["current-user-id"] as const,
  currentUserProfile: () => ["current-user-profile"] as const,
  profile: (userId: string | undefined) => ["profile", userId] as const,

  // ── Hotel Settings ───────────────────────────────────────────────────────
  hotelSettings: () => ["hotel-settings"] as const,
  adminHotelSettings: () => ["admin-hotel-settings"] as const,
  settingsRoomCapacity: () => ["settings-room-capacity"] as const,

  // ── Room Types ───────────────────────────────────────────────────────────
  roomTypes: () => ["room-types"] as const,
  roomType: (slug: string) => ["room-type", slug] as const,
  roomTypesForManager: () => ["room-types-for-manager"] as const,
  adminRoomTypes: () => ["admin-room-types"] as const,
  /** Omit roomTypeId to invalidate all guest-price queries as a prefix. */
  roomTypeGuestPrices: (roomTypeId?: string) =>
    roomTypeId ? ["room-type-guest-prices", roomTypeId] : ["room-type-guest-prices"],
  allRoomTypeGuestPrices: () => ["all-room-type-guest-prices"] as const,

  // ── Room Units ───────────────────────────────────────────────────────────
  allRoomUnitsActive: () => ["all-room-units-active"] as const,
  roomUnitsAvailable: (roomTypeId: string, ciStr: string, coStr: string) =>
    ["room-units-available", roomTypeId, ciStr, coStr] as const,
  roomUnitsWithType: () => ["room-units-with-type"] as const,
  roomUnitsSummary: () => ["room-units-summary"] as const,
  roomUnitsForOccupancy: () => ["room-units-for-occupancy"] as const,
  roomManagerUnits: () => ["room-manager-units"] as const,
  adminCalendarRooms: () => ["admin-calendar-rooms"] as const,

  // ── Room Photos ──────────────────────────────────────────────────────────
  roomPhotos: (roomTypeId: string) => ["room-photos", roomTypeId] as const,
  roomPhotosPublic: (roomTypeId: string) => ["room-photos-public", roomTypeId] as const,

  // ── Availability / Conflicts ─────────────────────────────────────────────
  availability: (
    roomTypeId: string | undefined,
    checkIn: string | undefined,
    checkOut: string | undefined,
  ) => ["availability", roomTypeId, checkIn, checkOut] as const,
  heroAvailability: (
    checkIn: string | undefined,
    checkOut: string | undefined,
    rooms: string,
  ) => ["hero-availability", checkIn, checkOut, rooms] as const,
  bookedUnitsForEdit: (
    reservationId: string | undefined,
    ciStr: string,
    coStr: string,
  ) => ["booked-units-for-edit", reservationId, ciStr, coStr] as const,
  conflictingRooms: (ciStr: string, coStr: string) =>
    ["conflicting-rooms", ciStr, coStr] as const,
  roomConflictsForGroup: (
    bookingId: string | undefined,
    checkIn: string,
    checkOut: string,
  ) => ["room-conflicts-for-group", bookingId, checkIn, checkOut] as const,

  // ── Bookings / Reservations ──────────────────────────────────────────────
  adminBookings: () => ["admin-bookings"] as const,
  /** Prefix used for broad calendar invalidation in AdminBookings. */
  adminCalendar: () => ["admin-calendar"] as const,
  /** Omit dates to invalidate all windowed reservation queries as a prefix. */
  adminCalendarReservations: (start?: string, end?: string) =>
    start && end
      ? ["admin-calendar-reservations", start, end]
      : ["admin-calendar-reservations"],
  /** Omit dates to invalidate all windowed group-booking queries as a prefix. */
  adminCalendarGroupBookings: (start?: string, end?: string) =>
    start && end
      ? ["admin-calendar-group-bookings", start, end]
      : ["admin-calendar-group-bookings"],
  adminArchive: () => ["admin-archive"] as const,
  dashboard: () => ["dashboard"] as const,
  /**
   * Dashboard revenue stats keyed by period.
   * Omit period to invalidate all admin-stats variants (dashboard + profile)
   * as a prefix — used by mutations that don't know the current period.
   */
  adminStats: (period?: string) =>
    period ? ["admin-stats", period] : ["admin-stats"],
  /**
   * Per-admin commission/profile stats.  Shares the "admin-stats" prefix with
   * adminStats so a bare QK.adminStats() invalidation covers both shapes.
   */
  adminProfileStats: (userId: string, start: string, end: string) =>
    ["admin-stats", userId, start, end] as const,

  // ── Group Bookings ───────────────────────────────────────────────────────
  groupBookings: () => ["group-bookings"] as const,
  groupBookingsForOccupancy: () => ["group-bookings-for-occupancy"] as const,
  groupBookingRequests: () => ["group-booking-requests"] as const,
  /** Omit bookingId to invalidate all room-assignment queries as a prefix. */
  groupRoomAssignments: (bookingId?: string) =>
    bookingId ? ["group-room-assignments", bookingId] : ["group-room-assignments"],
  groupCalcForBooking: (calcId: string | undefined) =>
    ["group-calc-for-booking", calcId] as const,
  groupCalculations: () => ["group-calculations"] as const,
  /** Omit period to invalidate all admin-group-stats variants as a prefix. */
  adminGroupStats: (period?: string) =>
    period ? ["admin-group-stats", period] : ["admin-group-stats"],

  // ── Banquets ─────────────────────────────────────────────────────────────
  adminBanquets: () => ["admin-banquets"] as const,

  // ── Promotions ───────────────────────────────────────────────────────────
  activePromotions: () => ["active-promotions"] as const,
  promotionsAdmin: () => ["promotions-admin"] as const,
  promotionsForPicker: () => ["promotions-for-picker"] as const,
  promoApplications: () => ["promo-applications"] as const,

  // ── Guest Forms ──────────────────────────────────────────────────────────
  /** Omit reservationId to invalidate all guest-form queries as a prefix. */
  guestForm: (reservationId?: string) =>
    reservationId ? ["guest-form", reservationId] : ["guest-form"],
  guestFormsView: (reservationId: string) =>
    ["guest-forms-view", reservationId] as const,

  // ── Profiles ─────────────────────────────────────────────────────────────
  adminProfile: () => ["admin-profile"] as const,
  adminProfilesLookup: () => ["admin-profiles-lookup"] as const,

  // ── Users ────────────────────────────────────────────────────────────────
  adminUsers: () => ["admin-users"] as const,

  // ── Owner Dashboard ──────────────────────────────────────────────────────
  ownerMonthReservations: (monthStart: string) =>
    ["owner-month-reservations", monthStart] as const,
  ownerLast6Reservations: () => ["owner-last6-reservations"] as const,
  ownerMonthGroupBookings: (monthStart: string) =>
    ["owner-month-group-bookings", monthStart] as const,
  ownerLast6GroupBookings: () => ["owner-last6-group-bookings"] as const,
  ownerRoomUnitsCount: () => ["owner-room-units-count"] as const,

  // ── Analytics ────────────────────────────────────────────────────────────
  analyticsReservations: (from: string, to: string) =>
    ["analytics-reservations", from, to] as const,
  analyticsGroupBookings: (from: string, to: string) =>
    ["analytics-group-bookings", from, to] as const,
  analyticsRoomUnits: () => ["analytics-room-units"] as const,
};
