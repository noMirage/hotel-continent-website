# Architecture

## Overview

The admin UI follows a strict **data-access separation** pattern: every Supabase call lives in a dedicated hook file under `src/hooks/`, never in a page or component file. Pages and components are responsible only for rendering and local UI state. React Query (`@tanstack/react-query`) is the data layer between hooks and the UI.

---

## Layer Structure

```
src/
├── integrations/supabase/     # Generated client + database types
├── lib/
│   ├── queryKeys.ts           # Centralized QK factory — every query key defined once
│   ├── supabase-types.ts      # Shared domain types (Reservation, RoomUnit, etc.)
│   ├── booking-conflicts.ts   # Conflict-check utilities (used by mutation hooks)
│   ├── room-pricing.ts        # Pricing logic (used by mutation hooks)
│   └── booking-status.ts      # Status badge/color helpers
├── hooks/                     # ALL data access lives here
├── pages/admin/               # Route-level components — zero Supabase calls
├── components/admin/          # Reusable UI components — zero Supabase calls (nearly)
├── config/hotel.ts            # Static hotel config (currency, name, etc.)
└── i18n/                      # Language context + translation strings
```

---

## Hook Conventions

### Naming
- `useXxxData.ts` — query hooks (read-only, React Query `useQuery`)
- `useXxxMutation.ts` / `useXxxMutations.ts` — mutation hooks (write operations)
- Paired files when a domain has both: `useAdminBanquetsData.ts` + `useAdminBanquetsMutation.ts`

### Mutation pattern
Every mutation hook:
1. Accepts an **explicit payload interface** — all inputs are passed at `.mutate(payload)` call time, nothing closed over from component state
2. Accepts a **`Callbacks` interface** — only for parent-owned state cleanup (e.g. `onSuccess: () => setDialogOpen(false)`)
3. Owns `useToast`, `useQueryClient`, and all `invalidateQueries` calls internally
4. Returns `{ wasEdit: boolean }` or similar from `mutationFn` when `onSuccess` needs to branch (e.g. different toast messages) without re-capturing component state

```ts
// Pattern example
export interface SaveInput { name: string; id: string | null; }
interface Callbacks { onSaveSuccess: () => void; }

export function useXxxMutation({ onSaveSuccess }: Callbacks) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (input: SaveInput): Promise<{ wasEdit: boolean }> => { ... },
    onSuccess: ({ wasEdit }) => {
      queryClient.invalidateQueries({ queryKey: QK.xxx() });
      toast({ title: wasEdit ? t("updated") : t("created") });
      onSaveSuccess();
    },
  });
}
```

### Query key factory
All keys are defined in `src/lib/queryKeys.ts` as the `QK` object. No raw string arrays appear anywhere in hook or component files. This makes invalidation refactor-safe — rename a key in one place, everything updates.

---

## Current State

### Admin Pages — 16 / 16 clean ✅

All 16 admin route pages have zero inline Supabase calls.

| Page | Hooks used |
|---|---|
| `AdminAnalytics` | `useAnalyticsReservations`, `useAnalyticsRoomUnits` |
| `AdminArchive` | `useAdminArchiveBookings` |
| `AdminBanquets` | `useAdminBanquets`, `useAdminBanquetsMutation` |
| `AdminBookings` | `useBookingsData`, `useBookingMutations` |
| `AdminCalendar` | `useCalendarData`, `useCalendarMutations` (uses `useToast` for drag-drop UI feedback — appropriate) |
| `AdminDashboard` | `useAdminDashboardStats`, `useAdminDashboardGroupStats` |
| `AdminGroupBookings` | `useGroupBookingsPageData`, `useGroupBookingsMutations` |
| `AdminGuide` | — (static content) |
| `AdminLogin` | `useAdminLogin` |
| `AdminOwnerDashboard` | `useOwnerMonthReservations`, `useOwnerLast6Reservations`, `useOwnerRoomUnitsCount` |
| `AdminProfile` | `useAdminProfile`, `useAdminProfileStats`, `useAdminProfileMutation` |
| `AdminPromotions` | `usePromotionsData`, `usePromotionsMutations` |
| `AdminRoomUnits` | `useRoomUnitsSummary` |
| `AdminRooms` | `useAdminRoomsData`, `useAdminRoomsMutations` |
| `AdminSettings` | `useAdminSettingsData`, `useAdminSettingsMutation` |
| `AdminUsers` | `useAdminUsersData`, `useAdminUsersMutations` |

### Admin Components — 17 / 22 clean ✅

| Component | Status | Remaining inline calls |
|---|---|---|
| `AdminLayout` | ⚠️ intentional | `supabase.auth.signOut()` × 2 — auth side-effect, not server state |
| `CalculationDialog` | ❌ | 1 mutation (`useMutation` for save/update group calculation + services) |
| `CalendarBookingDialog` | ⚠️ queries only | 4 `useQuery`: `guestForm`, `allRoomUnits`, `bookedUnitIds`, `allPromotions` |
| `CalendarGrid` | ✅ | — |
| `CalendarGroupDialog` | ⚠️ queries only | 6 `useQuery`: `allRoomUnits`, `stdConflicting`, `grpConflicting`, `allGuestPrices`, `calculations`, `activePromotions` |
| `CalendarRoomManager` | ⚠️ queries only | 2 `useQuery`: `roomUnits`, `roomTypes` |
| `CheckInPaymentDialog` | ✅ | — |
| `DeleteCheckinDialog` | ✅ | — |
| `GroupBookingCard` | ✅ | — |
| `GroupBookingDetailsDialog` | ✅ | — |
| `GroupBookingEditTab` | ✅ | — |
| `GroupBookingGuestsTab` | ✅ | — |
| `GroupBookingRequestCard` | ✅ | — |
| `GroupBookingViewTab` | ✅ | — |
| `GuestFormDialog` | ✅ | — |
| `KanbanAppCard` | ✅ | — |
| `KanbanAppColumn` | ✅ | — |
| `ManualBookingDialog` | ⚠️ queries only | 3 `useQuery`: `roomTypes`, `roomUnits`, `guestPrices` |
| `PromotionFormDialog` | ✅ | — |
| `RoomPhotosDialog` | ❌ | 2 mutations + 1 query + Supabase Storage calls |
| `SingleBookingRow` | ✅ | — |
| `ViewGuestFormDialog` | ⚠️ queries only | 1 `useQuery` for guest forms list |

### Hook Files — 40 total

```
# Auth / session
useAdminLogin.ts          — imperative login flow (not React Query)
useAdminSession.ts        — session presence / role check
useUserRole.ts            — role guards (isSuperAdmin, isViewer, isOwner)

# Dashboard / analytics
useAdminDashboardData.ts
useAdminAnalyticsData.ts
useOwnerDashboardData.ts

# Bookings
useBookingsData.ts
useBookingMutations.ts
useBookingAdminProfile.ts — assigned-admin name lookup for CalendarBookingDialog
useCalendarBookingMutation.ts
useCalendarMutations.ts   — calendar drag/resize/block mutations
useCalendarData.ts

# Group bookings
useGroupBookingsPageData.ts
useGroupBookingsMutations.ts
useGroupBookingDetailsData.ts
useGroupBookingDetailsMutations.ts
useCalendarGroupMutation.ts

# Guest forms
useGuestFormMutation.ts   — check-in flow: insert guest_forms + update reservation

# Manual booking
useManualBookingMutation.ts

# Calendar UI data
useCalendarGroupMutation.ts

# Rooms
useAdminRoomsData.ts
useAdminRoomsMutations.ts
useAdminRoomUnitsData.ts
useRoomUnitsMutations.ts  — save/delete/deactivate (exports RoomUnitFormState)
useRoomTypes.ts
useAvailability.ts
useLocalizedRoom.ts

# Settings / config
useAdminSettingsData.ts
useAdminSettingsMutation.ts
useHotelSettings.ts

# Users
useAdminUsersData.ts
useAdminUsersMutations.ts

# Profile
useAdminProfileData.ts
useAdminProfileMutation.ts

# Other
useAdminBanquetsData.ts
useAdminBanquetsMutation.ts
useAdminArchiveData.ts    — exports ArchiveBooking type
usePromotionsData.ts
usePromotionsMutations.ts
```

---

## What Remains

### High priority — mutations still inline

**`RoomPhotosDialog`** is the only component with both inline mutations and inline queries that have not been touched at all:
- `deleteMutation` — removes from `room_media` + `supabase.storage`
- `setPrimaryMutation` — updates `is_primary` across `room_media` + `room_types.image_url`
- 1 inline `useQuery` for photo list
- Inline upload handler hitting Supabase Storage directly

Target: `useRoomPhotosMutations.ts` + `useRoomPhotosData.ts`

**`CalculationDialog`** has 1 inline mutation:
- Single `useMutation` that upserts `group_calculations` + replaces `group_calculation_services` rows in one transaction

Target: `useCalculationMutation.ts`

### Lower priority — queries only

These components have no inline mutations — only `useQuery` calls that could be extracted for consistency:

| Component | Queries to extract | Suggested hook |
|---|---|---|
| `CalendarGroupDialog` | 6 queries (rooms, conflicts, prices, calculations, promotions) | `useCalendarGroupData.ts` |
| `CalendarBookingDialog` | 4 queries (guestForm, rooms, bookedIds, promotions) | `useCalendarBookingData.ts` |
| `ManualBookingDialog` | 3 queries (roomTypes, roomUnits, guestPrices) | `useManualBookingData.ts` |
| `CalendarRoomManager` | 2 queries (roomUnits, roomTypes) | extend `useAdminRoomUnitsData.ts` |
| `ViewGuestFormDialog` | 1 query (guest forms list) | extend `useGuestFormMutation.ts` or new `useGuestFormsData.ts` |

### Intentionally left as-is

**`AdminLayout`** — `supabase.auth.signOut()` is a navigation side-effect triggered by user action (logout button) and a role-guard redirect. This is not server state and does not belong in a React Query hook. It can stay.

---

## Why this pattern

**Testability.** Hooks are pure functions that accept callbacks and return mutation/query objects. They can be tested in isolation with a mock Supabase client without mounting any component.

**Single invalidation authority.** Each domain's invalidation logic lives in exactly one place. When the schema changes, there is one file to update — not a search across every component that touches that table.

**Type-safe payloads.** Exported input interfaces (`CreateManualBookingInput`, `UpdateDetailsInput`, etc.) make call sites explicit. TypeScript catches missing or mismatched fields at compile time rather than at runtime.

**No stale closures in mutations.** Passing all data through the explicit payload interface means `mutationFn` reads only from its argument — not from closed-over component state that may have changed between when the user clicked and when the async function runs.

**Collocated concerns.** Toast messages, query invalidation, and error handling for a domain are all in one file. Reading `useCalendarBookingMutation.ts` tells you everything the booking-edit flow does to the database and how it communicates the result back to the user.
