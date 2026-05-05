import React from "react";
import { Check, X, Loader2, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RoomUnitFull } from "@/hooks/useGroupBookingDetailsData";

function statusLabel(s: string, t: (k: string) => string): string {
  switch (s) {
    case "PENDING":   return t("bookings.pending");
    case "CONFIRMED": return t("bookings.confirmed");
    case "CHECK_IN":  return t("bookings.checkInStatus");
    case "CHECK_OUT": return t("bookings.checkOutStatus");
    case "CANCELLED": return t("bookings.cancelled");
    default:          return s;
  }
}

export interface GroupBookingEditFields {
  editContact: string;
  editPhone: string;
  editCheckIn: string;
  editCheckOut: string;
  editTotal: string;
  editDeposit: string;
  editStatus: string;
  editNotes: string;
  editRoomIds: string[];
  roomCheckInDraft: Record<string, string>;
  roomCheckOutDraft: Record<string, string>;
  roomNotesDraft: Record<string, string>;
}

export interface GroupBookingEditSetters {
  setEditContact: (v: string) => void;
  setEditPhone: (v: string) => void;
  setEditCheckIn: (v: string) => void;
  setEditCheckOut: (v: string) => void;
  setEditTotal: (v: string) => void;
  setEditDeposit: (v: string) => void;
  setEditStatus: (v: string) => void;
  setEditNotes: (v: string) => void;
  setEditRoomIds: React.Dispatch<React.SetStateAction<string[]>>;
  setRoomCheckInDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setRoomCheckOutDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setRoomNotesDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

interface Props {
  fields: GroupBookingEditFields;
  setters: GroupBookingEditSetters;
  bookingRooms: RoomUnitFull[];
  availableRoomsToAdd: RoomUnitFull[];
  language: string;
  t: (k: string) => string;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function GroupBookingEditTab({
  fields, setters, bookingRooms, availableRoomsToAdd, language, t,
  isSaving, onSave, onCancel,
}: Props) {
  const {
    editContact, editPhone, editCheckIn, editCheckOut,
    editTotal, editDeposit, editStatus, editNotes,
    roomCheckInDraft, roomCheckOutDraft, roomNotesDraft,
  } = fields;
  const {
    setEditContact, setEditPhone, setEditCheckIn, setEditCheckOut,
    setEditTotal, setEditDeposit, setEditStatus, setEditNotes,
    setEditRoomIds, setRoomCheckInDraft, setRoomCheckOutDraft, setRoomNotesDraft,
  } = setters;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-full text-destructive hover:bg-destructive/10 transition-colors"
          onClick={onCancel}
          title={t("groupBookings.cancel")}
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-full text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors disabled:opacity-50"
          onClick={onSave}
          disabled={isSaving}
          title={t("groupBookings.save")}
        >
          {isSaving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Check className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("groupBookings.contactPerson")}</Label>
          <Input value={editContact} onChange={e => setEditContact(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("groupBookings.phone")}</Label>
          <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("groupBookings.checkIn")}</Label>
          <Input type="date" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("groupBookings.checkOut")}</Label>
          <Input type="date" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("groupBookings.totalPrice")}</Label>
          <Input type="number" min={0} value={editTotal} onChange={e => setEditTotal(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("groupBookings.depositAmount")}</Label>
          <Input type="number" min={0} step={1} placeholder="0" value={editDeposit} onChange={e => setEditDeposit(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("groupBookings.status")}</Label>
          <Select value={editStatus} onValueChange={setEditStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["PENDING", "CONFIRMED", "CHECK_IN", "CHECK_OUT", "CANCELLED"].map(s => (
                <SelectItem key={s} value={s}>{statusLabel(s, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("groupBookings.adminNotes")}</Label>
        <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("groupBookings.rooms")}</p>
        {bookingRooms.map(room => {
          const typeName = language === "uk" ? (room.room_type?.name_uk || room.room_type?.name) : room.room_type?.name;
          return (
            <div key={room.id} className="border rounded-md p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {room.room_number}
                  <span className="text-muted-foreground font-normal text-xs ml-1">— {typeName}</span>
                </span>
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80 p-1 rounded"
                  title={t("groupBookings.cancelRoom")}
                  onClick={() => setEditRoomIds(prev => prev.filter(id => id !== room.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("groupBookings.checkInOverride")}</Label>
                  <Input type="date" className="h-8 text-xs"
                    value={roomCheckInDraft[room.id] ?? ""}
                    onChange={e => setRoomCheckInDraft(prev => ({ ...prev, [room.id]: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("groupBookings.checkOutOverride")}</Label>
                  <Input type="date" className="h-8 text-xs"
                    value={roomCheckOutDraft[room.id] ?? ""}
                    onChange={e => setRoomCheckOutDraft(prev => ({ ...prev, [room.id]: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("groupBookings.roomNotes")}</Label>
                <Input className="h-8 text-xs"
                  placeholder={t("groupBookings.roomNotesPlaceholder")}
                  value={roomNotesDraft[room.id] ?? ""}
                  onChange={e => setRoomNotesDraft(prev => ({ ...prev, [room.id]: e.target.value }))} />
              </div>
            </div>
          );
        })}

        {availableRoomsToAdd.length > 0 && (
          <div className="flex items-center gap-2">
            <Select onValueChange={roomId => setEditRoomIds(prev => [...prev, roomId])}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder={t("groupBookings.addRoom")} />
              </SelectTrigger>
              <SelectContent>
                {availableRoomsToAdd.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.room_number} — {language === "uk" ? (u.room_type?.name_uk || u.room_type?.name) : u.room_type?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}
