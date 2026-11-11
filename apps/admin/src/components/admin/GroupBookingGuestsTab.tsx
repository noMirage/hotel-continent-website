import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { Check, X, Download, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RoomUnitFull } from "@/hooks/useGroupBookingDetailsData";
import type { SaveGuestItem } from "@/hooks/useGroupBookingDetailsMutations";

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

export interface GuestDrafts {
  numGuestsDraft: Record<string, string>;
  guestEditDraft: Record<string, string[]>;
  extraGuestsDraft: Record<string, string[]>;
  feeDraft: Record<string, { early: string; late: string }>;
  extraAccomDraft: Record<string, string>;
  ubdCheckedDraft: Record<string, boolean[]>;
  ubdDocDraft: Record<string, string[]>;
}

export interface GuestDraftSetters {
  setNumGuestsDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setGuestEditDraft: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setExtraGuestsDraft: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setFeeDraft: React.Dispatch<React.SetStateAction<Record<string, { early: string; late: string }>>>;
  setExtraAccomDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setUbdCheckedDraft: React.Dispatch<React.SetStateAction<Record<string, boolean[]>>>;
  setUbdDocDraft: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

interface Props {
  bookingRooms: RoomUnitFull[];
  bookingName: string;
  drafts: GuestDrafts;
  setters: GuestDraftSetters;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveGuestsMutation: any;
  hotelSettings: { extra_capacity: number } | null | undefined;
  language: string;
  t: (k: string) => string;
  onCancel: () => void;
}

export function GroupBookingGuestsTab({
  bookingRooms, bookingName, drafts, setters,
  saveGuestsMutation, hotelSettings, language, t, onCancel,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    numGuestsDraft, guestEditDraft, extraGuestsDraft,
    feeDraft, extraAccomDraft, ubdCheckedDraft, ubdDocDraft,
  } = drafts;
  const {
    setNumGuestsDraft, setGuestEditDraft, setExtraGuestsDraft,
    setFeeDraft, setExtraAccomDraft, setUbdCheckedDraft, setUbdDocDraft,
  } = setters;

  function handleNumGuestsChange(roomId: string, val: string) {
    const n = Math.max(1, parseInt(val) || 1);
    setNumGuestsDraft(prev => ({ ...prev, [roomId]: String(n) }));
    setGuestEditDraft(prev => ({
      ...prev,
      [roomId]: Array.from({ length: n }, (_, i) => (prev[roomId] ?? [])[i] ?? ""),
    }));
    setUbdCheckedDraft(prev => ({
      ...prev,
      [roomId]: Array.from({ length: n }, (_, i) => (prev[roomId] ?? [])[i] ?? false),
    }));
    setUbdDocDraft(prev => ({
      ...prev,
      [roomId]: Array.from({ length: n }, (_, i) => (prev[roomId] ?? [])[i] ?? ""),
    }));
  }

  function buildSaveItems(): SaveGuestItem[] {
    return bookingRooms.map(r => {
      const count = parseInt(numGuestsDraft[r.id] || "1") || 1;
      const ubdDocuments = Array.from({ length: count }, (_, i) =>
        ubdCheckedDraft[r.id]?.[i] ? (ubdDocDraft[r.id]?.[i] ?? "") : ""
      );
      return {
        roomUnitId: r.id,
        guestNames: Array.from({ length: count }, (_, i) => (guestEditDraft[r.id] ?? [])[i] ?? ""),
        extraGuestNames: extraGuestsDraft[r.id] ?? [],
        ubdDocuments,
        earlyFee: parseFloat(feeDraft[r.id]?.early || "0") || 0,
        lateFee:  parseFloat(feeDraft[r.id]?.late  || "0") || 0,
        extraAccom: parseInt(extraAccomDraft[r.id] || "0") || 0,
      };
    });
  }

  function handleDownloadTemplate() {
    const rows: unknown[][] = [["Room Number", "Guest #", "Guest Full Name"]];
    bookingRooms.forEach(r => {
      const n = parseInt(numGuestsDraft[r.id] || "1") || 1;
      for (let i = 1; i <= n; i++) {
        rows.push([r.room_number, i, guestEditDraft[r.id]?.[i - 1] ?? ""]);
      }
      const extraCount = parseInt(extraAccomDraft[r.id] || "0") || 0;
      for (let i = 0; i < extraCount; i++) {
        rows.push([r.room_number, `Extra ${i + 1}`, extraGuestsDraft[r.id]?.[i] ?? ""]);
      }
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guest List");
    XLSX.writeFile(wb, `Guest_List_${bookingName || "group"}.xlsx`);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      let rows: Array<Record<string, string>> = [];
      if (isExcel) {
        const data = ev.target?.result as ArrayBuffer;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" }).map(row => {
          const r: Record<string, string> = {};
          for (const k in row) r[k] = String(row[k]);
          return r;
        });
      } else {
        rows = parseCSV(ev.target?.result as string);
      }
      const byRoom: Record<string, { regular: Array<{ guestNum: number; name: string }>; extra: Array<{ idx: number; name: string }> }> = {};
      rows.forEach(row => {
        const roomNum    = String(row["Room Number"] ?? "").trim();
        const guestNumRaw = String(row["Guest #"]     ?? "").trim();
        const name       = String(row["Guest Full Name"] ?? "").trim();
        if (!roomNum) return;
        if (!byRoom[roomNum]) byRoom[roomNum] = { regular: [], extra: [] };
        const extraMatch = guestNumRaw.match(/^Extra\s*(\d+)$/i);
        if (extraMatch) {
          byRoom[roomNum].extra.push({ idx: parseInt(extraMatch[1]) - 1, name });
        } else {
          byRoom[roomNum].regular.push({ guestNum: parseInt(guestNumRaw) || 1, name });
        }
      });
      const parsed = Object.entries(byRoom)
        .map(([rn, entries]) => {
          const unit = bookingRooms.find(u => String(u.room_number) === rn);
          if (!unit) return null;
          const regularNames = [...entries.regular].sort((a, b) => a.guestNum - b.guestNum).map(e => e.name);
          const extraNames   = [...entries.extra].sort((a, b) => a.idx - b.idx).map(e => e.name);
          return { roomUnitId: unit.id, guestNames: regularNames, extraGuestNames: extraNames };
        })
        .filter(Boolean) as Array<{ roomUnitId: string; guestNames: string[]; extraGuestNames: string[] }>;

      if (parsed.length > 0) {
        setNumGuestsDraft(prev => {
          const next = { ...prev };
          parsed.forEach(p => { next[p.roomUnitId] = String(p.guestNames.length || 1); });
          return next;
        });
        setGuestEditDraft(prev => {
          const next = { ...prev };
          parsed.forEach(p => { next[p.roomUnitId] = p.guestNames; });
          return next;
        });
        setExtraGuestsDraft(prev => {
          const next = { ...prev };
          parsed.forEach(p => { next[p.roomUnitId] = p.extraGuestNames; });
          return next;
        });
        saveGuestsMutation.mutate(
          parsed.map(p => ({
            roomUnitId: p.roomUnitId,
            guestNames: p.guestNames,
            extraGuestNames: p.extraGuestNames,
            ubdDocuments: ubdDocDraft[p.roomUnitId] ?? [],
            earlyFee: parseFloat(feeDraft[p.roomUnitId]?.early || "0") || 0,
            lateFee:  parseFloat(feeDraft[p.roomUnitId]?.late  || "0") || 0,
            extraAccom: parseInt(extraAccomDraft[p.roomUnitId] || "0") || 0,
          }))
        );
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md hover:bg-muted"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4" />{t("groupBookings.downloadTemplate")}
          </button>
          <button
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 border rounded-md hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
            disabled={saveGuestsMutation.isPending}
          >
            <Upload className="h-4 w-4" />{t("groupBookings.uploadGuestList")}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
        </div>
        <div className="flex gap-1.5">
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
            onClick={() => saveGuestsMutation.mutate(buildSaveItems())}
            disabled={saveGuestsMutation.isPending}
            title={t("groupBookings.saveGuests")}
          >
            {saveGuestsMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Check className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {bookingRooms.map(room => {
        const typeName = language === "uk" ? (room.room_type?.name_uk || room.room_type?.name) : room.room_type?.name;
        const thisExtra   = parseInt(extraAccomDraft[room.id] || "0");
        const totalInDraft = Object.values(extraAccomDraft).reduce((s, v) => s + (parseInt(v) || 0), 0);
        const remaining   = (hotelSettings?.extra_capacity ?? 0) - (totalInDraft - thisExtra);
        const maxForRoom  = Math.min(room.extra_accommodation_max, Math.max(0, remaining));
        return (
          <div key={room.id} className="border rounded-md p-3 space-y-3">
            <p className="text-sm font-semibold">
              {room.room_number} <span className="text-muted-foreground font-normal text-xs">— {typeName}</span>
            </p>
            <div className="flex items-center gap-3">
              <Label className="text-xs shrink-0 text-muted-foreground">{t("groupBookings.numGuestsInRoom")}:</Label>
              <Select
                value={numGuestsDraft[room.id] ?? "1"}
                onValueChange={val => handleNumGuestsChange(room.id, val)}
              >
                <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: room.room_type?.max_guests || 4 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {(guestEditDraft[room.id] ?? []).map((name, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      {t("groupBookings.guestN").replace("{n}", String(idx + 1))}
                    </span>
                    <Input
                      value={name}
                      onChange={e => setGuestEditDraft(prev => {
                        const next = [...(prev[room.id] ?? [])];
                        next[idx] = e.target.value;
                        return { ...prev, [room.id]: next };
                      })}
                      placeholder="Full name..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pl-[4.5rem]">
                    <Checkbox
                      id={`ubd-${room.id}-${idx}`}
                      checked={ubdCheckedDraft[room.id]?.[idx] ?? false}
                      onCheckedChange={checked => {
                        setUbdCheckedDraft(prev => {
                          const next = [...(prev[room.id] ?? Array(guestEditDraft[room.id]?.length ?? 1).fill(false))];
                          next[idx] = !!checked;
                          return { ...prev, [room.id]: next };
                        });
                        if (!checked) {
                          setUbdDocDraft(prev => {
                            const next = [...(prev[room.id] ?? [])];
                            next[idx] = "";
                            return { ...prev, [room.id]: next };
                          });
                        }
                      }}
                    />
                    <label htmlFor={`ubd-${room.id}-${idx}`} className="text-xs font-medium text-amber-700 cursor-pointer select-none">
                      {t("groupBookings.ubdLabel")} (-20%)
                    </label>
                    {ubdCheckedDraft[room.id]?.[idx] && (
                      <Input
                        value={ubdDocDraft[room.id]?.[idx] ?? ""}
                        onChange={e => setUbdDocDraft(prev => {
                          const next = [...(prev[room.id] ?? [])];
                          next[idx] = e.target.value;
                          return { ...prev, [room.id]: next };
                        })}
                        placeholder={t("groupBookings.ubdDocPlaceholder")}
                        className="h-7 text-xs flex-1"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("groupBookings.earlyCheckin")}</Label>
                <Input type="number" min={0} step={50} placeholder="0"
                  value={feeDraft[room.id]?.early ?? ""}
                  onChange={e => setFeeDraft(prev => ({ ...prev, [room.id]: { ...prev[room.id], early: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("groupBookings.lateCheckout")}</Label>
                <Input type="number" min={0} step={50} placeholder="0"
                  value={feeDraft[room.id]?.late ?? ""}
                  onChange={e => setFeeDraft(prev => ({ ...prev, [room.id]: { ...prev[room.id], late: e.target.value } }))} />
              </div>
            </div>

            {room.extra_accommodation_enabled && (
              <div className="space-y-2 pt-1 border-t border-border">
                <Label className="text-xs">{t("groupBookings.extraAccom")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={maxForRoom}
                    value={extraAccomDraft[room.id] ?? "0"}
                    onChange={e => {
                      const v = Math.min(parseInt(e.target.value) || 0, maxForRoom);
                      setExtraAccomDraft(prev => ({ ...prev, [room.id]: String(v) }));
                      setExtraGuestsDraft(prev => ({
                        ...prev,
                        [room.id]: Array.from({ length: v }, (_, i) => (prev[room.id] ?? [])[i] ?? ""),
                      }));
                    }}
                    className="w-20 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    {t("groupBookings.extraAccomInRoom")}: {room.extra_accommodation_max}
                    {" · "}{remaining} {t("groupBookings.extraAccomAvail")}
                  </span>
                </div>
                {thisExtra > 0 && (
                  <div className="space-y-2">
                    {Array.from({ length: thisExtra }, (_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-amber-700 w-16 shrink-0">+{i + 1}</span>
                        <Input
                          value={extraGuestsDraft[room.id]?.[i] ?? ""}
                          onChange={e => setExtraGuestsDraft(prev => {
                            const next = [...(prev[room.id] ?? Array(thisExtra).fill(""))];
                            next[i] = e.target.value;
                            return { ...prev, [room.id]: next };
                          })}
                          placeholder="Full name..."
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
