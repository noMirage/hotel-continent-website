import { useState, useEffect } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GroupBooking } from "@/lib/supabase-types";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  useGroupBookingRoomUnits,
  useGroupBookingAssignments,
  useGroupBookingCalc,
  useRoomConflictsForGroup,
} from "@/hooks/useGroupBookingDetailsData";
import { useGroupBookingDetailsMutations } from "@/hooks/useGroupBookingDetailsMutations";
import { GroupBookingViewTab, type SavedViewData } from "./GroupBookingViewTab";
import { GroupBookingEditTab, type GroupBookingEditFields, type GroupBookingEditSetters } from "./GroupBookingEditTab";
import { GroupBookingGuestsTab, type GuestDrafts, type GuestDraftSetters } from "./GroupBookingGuestsTab";

interface Props {
  booking: GroupBooking | null;
  onClose: () => void;
  defaultTab?: "view" | "edit" | "guests";
}

export function GroupBookingDetailsDialog({ booking, onClose, defaultTab = "view" }: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { data: hotelSettings } = useHotelSettings();

  const [activeTab, setActiveTab] = useState<"view" | "edit" | "guests">(defaultTab);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editContact, setEditContact]   = useState("");
  const [editPhone, setEditPhone]       = useState("");
  const [editCheckIn, setEditCheckIn]   = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editTotal, setEditTotal]       = useState("");
  const [editDeposit, setEditDeposit]   = useState("");
  const [editStatus, setEditStatus]     = useState("");
  const [editNotes, setEditNotes]       = useState("");
  const [editRoomIds, setEditRoomIds]   = useState<string[]>([]);
  const [roomCheckInDraft, setRoomCheckInDraft]   = useState<Record<string, string>>({});
  const [roomCheckOutDraft, setRoomCheckOutDraft] = useState<Record<string, string>>({});
  const [roomNotesDraft, setRoomNotesDraft]       = useState<Record<string, string>>({});
  const [savedViewData, setSavedViewData] = useState<SavedViewData | null>(null);

  // ── Guest draft state ───────────────────────────────────────────────────────
  const [numGuestsDraft, setNumGuestsDraft]       = useState<Record<string, string>>({});
  const [guestEditDraft, setGuestEditDraft]       = useState<Record<string, string[]>>({});
  const [extraGuestsDraft, setExtraGuestsDraft]   = useState<Record<string, string[]>>({});
  const [feeDraft, setFeeDraft]                   = useState<Record<string, { early: string; late: string }>>({});
  const [extraAccomDraft, setExtraAccomDraft]     = useState<Record<string, string>>({});
  const [ubdCheckedDraft, setUbdCheckedDraft]     = useState<Record<string, boolean[]>>({});
  const [ubdDocDraft, setUbdDocDraft]             = useState<Record<string, string[]>>({});

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: roomUnits }    = useGroupBookingRoomUnits(!!booking);
  const { data: assignments }  = useGroupBookingAssignments(booking?.id);
  const { data: bookingCalc }  = useGroupBookingCalc(booking?.calculation_id);
  const allRoomUnitIds = (roomUnits ?? []).map(u => u.id);
  const { data: conflictingRoomIds } = useRoomConflictsForGroup(
    booking?.id, editCheckIn, editCheckOut, allRoomUnitIds,
  );

  // ── Derived values ──────────────────────────────────────────────────────────
  const bookingRooms = booking
    ? (roomUnits ?? [])
        .filter(u => editRoomIds.includes(u.id))
        .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))
    : [];

  const availableRoomsToAdd = (roomUnits ?? [])
    .filter(u => !editRoomIds.includes(u.id) && !(conflictingRoomIds ?? []).includes(u.id))
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  const nights = booking
    ? differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date))
    : 0;

  // ── Mutation hook ───────────────────────────────────────────────────────────
  const { updateBookingMutation, saveGuestsMutation } = useGroupBookingDetailsMutations(
    booking,
    bookingCalc,
    {
      onUpdateSuccess: ({ newTotal, newDeposit }) => {
        setSavedViewData(prev => ({
          total_price: newTotal,
          deposit_amount: newDeposit,
          num_guests: prev?.num_guests ?? booking?.num_guests ?? 0,
        }));
        setActiveTab("view");
      },
      onGuestsSaved: ({ newNumGuests, newTotalPrice }) => {
        setSavedViewData(prev => ({
          total_price: newTotalPrice ?? prev?.total_price ?? Number(booking?.total_price ?? 0),
          deposit_amount: prev?.deposit_amount ?? booking?.deposit_amount ?? null,
          num_guests: newNumGuests,
        }));
      },
    },
  );

  // ── Reset edit state when booking changes ───────────────────────────────────
  useEffect(() => {
    if (!booking) return;
    setActiveTab(defaultTab);
    setEditContact(booking.contact_person);
    setEditPhone(booking.phone ?? "");
    setEditCheckIn(booking.check_in_date);
    setEditCheckOut(booking.check_out_date);
    setEditTotal(String(booking.total_price));
    setEditDeposit(booking.deposit_amount ? String(booking.deposit_amount) : "");
    setEditStatus(booking.status);
    setEditNotes(booking.admin_notes ?? "");
    setEditRoomIds(booking.room_unit_ids);
    setRoomCheckInDraft({});
    setRoomCheckOutDraft({});
    setRoomNotesDraft({});
    setSavedViewData(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, defaultTab]);

  // ── Initialize guest drafts for newly-added rooms ───────────────────────────
  useEffect(() => {
    setNumGuestsDraft(prev => {
      const next: Record<string, string> = {};
      editRoomIds.forEach(id => { if (prev[id] === undefined) next[id] = "1"; });
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
    setGuestEditDraft(prev => {
      const next: Record<string, string[]> = {};
      editRoomIds.forEach(id => { if (prev[id] === undefined) next[id] = [""]; });
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
    setUbdCheckedDraft(prev => {
      const next: Record<string, boolean[]> = {};
      editRoomIds.forEach(id => { if (prev[id] === undefined) next[id] = [false]; });
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
    setUbdDocDraft(prev => {
      const next: Record<string, string[]> = {};
      editRoomIds.forEach(id => { if (prev[id] === undefined) next[id] = [""]; });
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
    setFeeDraft(prev => {
      const next: Record<string, { early: string; late: string }> = {};
      editRoomIds.forEach(id => { if (prev[id] === undefined) next[id] = { early: "", late: "" }; });
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
    setExtraAccomDraft(prev => {
      const next: Record<string, string> = {};
      editRoomIds.forEach(id => { if (prev[id] === undefined) next[id] = "0"; });
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
    setExtraGuestsDraft(prev => {
      const next: Record<string, string[]> = {};
      editRoomIds.forEach(id => { if (prev[id] === undefined) next[id] = []; });
      return Object.keys(next).length ? { ...prev, ...next } : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRoomIds]);

  // ── Sync guest drafts from loaded assignments ───────────────────────────────
  useEffect(() => {
    if (!bookingRooms.length || !assignments) return;
    const nums: Record<string, string>            = {};
    const guests: Record<string, string[]>        = {};
    const extraGuests: Record<string, string[]>   = {};
    const fees: Record<string, { early: string; late: string }> = {};
    const extras: Record<string, string>          = {};
    const ubdChecked: Record<string, boolean[]>   = {};
    const ubdDocs: Record<string, string[]>       = {};
    bookingRooms.forEach(r => {
      const a = assignments.find(x => x.room_unit_id === r.id);
      const names       = a?.guest_names      ?? [];
      const extraNames  = a?.extra_guest_names ?? [];
      const extraCount  = a?.extra_accommodation ?? 0;
      const ubdDocuments = a?.ubd_documents   ?? [];
      const count = Math.max(names.length, 1);
      nums[r.id]        = String(count);
      guests[r.id]      = Array.from({ length: count }, (_, i) => names[i] ?? "");
      extraGuests[r.id] = Array.from({ length: extraCount }, (_, i) => extraNames[i] ?? "");
      fees[r.id]        = {
        early: a?.early_checkin_fee ? String(a.early_checkin_fee) : "",
        late:  a?.late_checkout_fee  ? String(a.late_checkout_fee)  : "",
      };
      extras[r.id]      = String(extraCount);
      ubdChecked[r.id]  = Array.from({ length: count }, (_, i) => !!(ubdDocuments[i]?.trim()));
      ubdDocs[r.id]     = Array.from({ length: count }, (_, i) => ubdDocuments[i] ?? "");
    });
    setNumGuestsDraft(nums);
    setGuestEditDraft(guests);
    setExtraGuestsDraft(extraGuests);
    setFeeDraft(fees);
    setExtraAccomDraft(extras);
    setUbdCheckedDraft(ubdChecked);
    setUbdDocDraft(ubdDocs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, booking?.id]);

  // ── Sync per-room overrides from assignments ────────────────────────────────
  useEffect(() => {
    if (!assignments || !booking) return;
    const ci: Record<string, string>    = {};
    const co: Record<string, string>    = {};
    const notes: Record<string, string> = {};
    assignments.forEach(a => {
      if (a.check_in_override)  ci[a.room_unit_id]    = a.check_in_override;
      if (a.check_out_override) co[a.room_unit_id]    = a.check_out_override;
      if (a.room_notes)         notes[a.room_unit_id] = a.room_notes;
    });
    setRoomCheckInDraft(ci);
    setRoomCheckOutDraft(co);
    setRoomNotesDraft(notes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, booking?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleCancelEdit() {
    if (!booking) return;
    setEditContact(booking.contact_person);
    setEditPhone(booking.phone ?? "");
    setEditCheckIn(booking.check_in_date);
    setEditCheckOut(booking.check_out_date);
    setEditTotal(String(booking.total_price));
    setEditDeposit(booking.deposit_amount ? String(booking.deposit_amount) : "");
    setEditStatus(booking.status);
    setEditNotes(booking.admin_notes ?? "");
    setEditRoomIds(booking.room_unit_ids);
    setRoomCheckInDraft({});
    setRoomCheckOutDraft({});
    setRoomNotesDraft({});
    setActiveTab("view");
  }

  function handleSaveBooking() {
    if (!booking) return;
    updateBookingMutation.mutate({
      contact: editContact,
      phone: editPhone,
      checkIn: editCheckIn,
      checkOut: editCheckOut,
      total: editTotal,
      deposit: editDeposit,
      status: editStatus,
      notes: editNotes,
      roomIds: editRoomIds,
      originalRoomIds: booking.room_unit_ids,
      roomCheckIn: roomCheckInDraft,
      roomCheckOut: roomCheckOutDraft,
      roomNotes: roomNotesDraft,
    });
  }

  if (!booking) return null;

  // ── Prop bundles for tabs ───────────────────────────────────────────────────
  const editFields: GroupBookingEditFields = {
    editContact, editPhone, editCheckIn, editCheckOut,
    editTotal, editDeposit, editStatus, editNotes,
    editRoomIds, roomCheckInDraft, roomCheckOutDraft, roomNotesDraft,
  };
  const editSetters: GroupBookingEditSetters = {
    setEditContact, setEditPhone, setEditCheckIn, setEditCheckOut,
    setEditTotal, setEditDeposit, setEditStatus, setEditNotes,
    setEditRoomIds, setRoomCheckInDraft, setRoomCheckOutDraft, setRoomNotesDraft,
  };
  const guestDrafts: GuestDrafts = {
    numGuestsDraft, guestEditDraft, extraGuestsDraft,
    feeDraft, extraAccomDraft, ubdCheckedDraft, ubdDocDraft,
  };
  const guestSetters: GuestDraftSetters = {
    setNumGuestsDraft, setGuestEditDraft, setExtraGuestsDraft,
    setFeeDraft, setExtraAccomDraft, setUbdCheckedDraft, setUbdDocDraft,
  };

  return (
    <Dialog open={!!booking} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {booking.booking_name}
          </DialogTitle>
          <DialogDescription>
            {booking.contact_person}{booking.phone ? ` · ${booking.phone}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b pb-2">
          {(["view", "edit", "guests"] as const).map(tab => (
            <button key={tab}
              className={cn("px-3 py-1 text-sm rounded-md transition-colors",
                activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
              onClick={() => setActiveTab(tab)}>
              {tab === "view"   ? t("groupBookings.details") :
               tab === "edit"   ? t("groupBookings.editDetails") :
               t("groupBookings.manageGuests")}
            </button>
          ))}
        </div>

        {activeTab === "view" && (
          <GroupBookingViewTab
            booking={booking}
            bookingRooms={bookingRooms}
            assignments={assignments}
            bookingCalc={bookingCalc}
            nights={nights}
            language={language}
            dateLocale={dateLocale}
            t={t}
            savedViewData={savedViewData}
            numGuestsDraft={numGuestsDraft}
            extraAccomDraft={extraAccomDraft}
            ubdCheckedDraft={ubdCheckedDraft}
          />
        )}

        {activeTab === "edit" && (
          <GroupBookingEditTab
            fields={editFields}
            setters={editSetters}
            bookingRooms={bookingRooms}
            availableRoomsToAdd={availableRoomsToAdd}
            language={language}
            t={t}
            isSaving={updateBookingMutation.isPending}
            onSave={handleSaveBooking}
            onCancel={handleCancelEdit}
          />
        )}

        {activeTab === "guests" && (
          <GroupBookingGuestsTab
            bookingRooms={bookingRooms}
            bookingName={booking.booking_name}
            drafts={guestDrafts}
            setters={guestSetters}
            saveGuestsMutation={saveGuestsMutation}
            hotelSettings={hotelSettings}
            language={language}
            t={t}
            onCancel={() => setActiveTab("view")}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("groupBookings.cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
