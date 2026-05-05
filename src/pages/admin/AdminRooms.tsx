import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, BedDouble, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { hotelConfig } from "@/config/hotel";
import type { RoomType } from "@/lib/supabase-types";
import { RoomPhotosDialog } from "@/components/admin/RoomPhotosDialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAdminRoomTypes, useRoomTypeGuestPrices } from "@/hooks/useAdminRoomsData";
import { useAdminRoomsMutations } from "@/hooks/useAdminRoomsMutations";

export default function AdminRooms() {
  const { t, language } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [photosRoom, setPhotosRoom] = useState<RoomType | null>(null);
  const [guestPriceDraft, setGuestPriceDraft] = useState<{ guest_count: string; price_per_night: string }[]>([]);
  const [formData, setFormData] = useState({
    name: "", slug: "", description: "", short_description: "",
    name_uk: "", description_uk: "", short_description_uk: "", amenities_uk: "",
    base_price: "", max_guests: "2", size_sqm: "", bed_type: "",
    amenities: "", is_active: true,
  });
  
  const { data: existingGuestPrices } = useRoomTypeGuestPrices(editingRoom?.id);

  useEffect(() => {
    if (!isDialogOpen) return;
    if (editingRoom && existingGuestPrices) {
      setGuestPriceDraft(existingGuestPrices.map(p => ({
        guest_count: String(p.guest_count),
        price_per_night: String(p.price_per_night),
      })));
    }
  }, [existingGuestPrices, editingRoom, isDialogOpen]);

  const { data: roomTypes, isLoading } = useAdminRoomTypes();

  const { saveMutation, deleteMutation } = useAdminRoomsMutations({
    onSaveSuccess: () => { setIsDialogOpen(false); setEditingRoom(null); },
  });
  
  const openDialog = (room?: RoomType) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name, slug: room.slug, description: room.description || "",
        short_description: room.short_description || "", base_price: room.base_price.toString(),
        max_guests: room.max_guests.toString(), size_sqm: room.size_sqm?.toString() || "",
        bed_type: room.bed_type || "", amenities: room.amenities?.join(", ") || "",
        name_uk: room.name_uk || "", description_uk: room.description_uk || "",
        short_description_uk: room.short_description_uk || "",
        amenities_uk: room.amenities_uk?.join(", ") || "",
        is_active: room.is_active,
      });
      // prices loaded via useEffect once existingGuestPrices resolves
    } else {
      setEditingRoom(null);
      setGuestPriceDraft([]);
      setFormData({
        name: "", slug: "", description: "", short_description: "",
        name_uk: "", description_uk: "", short_description_uk: "", amenities_uk: "",
        base_price: "", max_guests: "2", size_sqm: "", bed_type: "",
        amenities: "", is_active: true,
      });
    }
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => { setIsDialogOpen(false); setEditingRoom(null); };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ formData, editingRoomId: editingRoom?.id ?? null, guestPriceDraft });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("adminRooms.title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-48" />))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("adminRooms.title")}</h1>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t("adminRooms.addRoomType")}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roomTypes?.map((room) => (
          <Card key={room.id} className={!room.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BedDouble className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {language === "uk" ? (room.name_uk || room.name) : room.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {hotelConfig.currencySymbol}{room.base_price}{t("adminRooms.night")} • {t("adminRooms.upTo")} {room.max_guests} {t("adminRooms.guests")}
                    </p>
                  </div>
                </div>
                {!room.is_active && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">{t("adminRooms.inactive")}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {language === "uk"
                  ? (room.short_description_uk || room.description_uk || room.short_description || room.description || t("adminRooms.noDescription"))
                  : (room.short_description || room.description || t("adminRooms.noDescription"))}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="" onClick={() => openDialog(room)}>
                  <Edit className="h-4 w-4 mr-1" /> {t("adminRooms.edit")}
                </Button>
                <Button variant="outline" size="sm" className="" onClick={() => setPhotosRoom(room)}>
                  <ImageIcon className="h-4 w-4 mr-1" /> {t("adminRooms.photos")}
                </Button>
                <Button variant="outline" size="sm" className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" onClick={() => {
                  if (confirm(t("adminRooms.deleteConfirm"))) deleteMutation.mutate(room.id);
                }}>
                  <Trash2 className="h-4 w-4 mr-1" /> {t("adminRooms.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoom ? t("adminRooms.editRoomType") : t("adminRooms.addRoomType")}</DialogTitle>
            <DialogDescription>
              {editingRoom ? t("adminRooms.updateDetails") : t("adminRooms.createNew")}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("adminRooms.name")} *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t("adminRooms.slug")}</Label>
                <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="short_description">{t("adminRooms.shortDesc")}</Label>
              <Input id="short_description" value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("adminRooms.fullDesc")}</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">{t("adminRooms.priceNight")} *</Label>
                <Input id="base_price" type="number" step="0.01" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_guests">{t("adminRooms.maxGuests")} *</Label>
                <Input id="max_guests" type="number" value={formData.max_guests} onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size_sqm">{t("adminRooms.size")}</Label>
                <Input id="size_sqm" type="number" value={formData.size_sqm} onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed_type">{t("adminRooms.bedType")}</Label>
                <Input id="bed_type" value={formData.bed_type} onChange={(e) => setFormData({ ...formData, bed_type: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amenities">{t("adminRooms.amenities")}</Label>
              <Textarea id="amenities" value={formData.amenities} onChange={(e) => setFormData({ ...formData, amenities: e.target.value })} rows={2} />
            </div>

            {/* Per-guest pricing tiers */}
            <div className="border-t border-border pt-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("adminRooms.guestPricing")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("adminRooms.guestPricingHint")}</p>
                </div>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => setGuestPriceDraft(prev => [...prev, { guest_count: "", price_per_night: "" }])}
                >
                  <Plus className="h-3 w-3 mr-1" />{t("adminRooms.addGuestPrice")}
                </Button>
              </div>
              {guestPriceDraft.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{t("adminRooms.noGuestPricing")}</p>
              ) : (
                <div className="space-y-2">
                  {guestPriceDraft.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="number" min="1" max={formData.max_guests || 10}
                        className="w-20" placeholder="1"
                        value={row.guest_count}
                        onChange={e => setGuestPriceDraft(prev => prev.map((r, j) => j === i ? { ...r, guest_count: e.target.value } : r))}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{t("adminRooms.guests")}</span>
                      <span className="text-muted-foreground">→</span>
                      <Input
                        type="number" step="0.01" min="0"
                        className="flex-1" placeholder="0.00"
                        value={row.price_per_night}
                        onChange={e => setGuestPriceDraft(prev => prev.map((r, j) => j === i ? { ...r, price_per_night: e.target.value } : r))}
                      />
                      <span className="text-sm text-muted-foreground">{t("adminRooms.night")}</span>
                      <Button
                        type="button" size="sm" variant="ghost"
                        onClick={() => setGuestPriceDraft(prev => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ukrainian translations */}
            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-semibold text-foreground mb-3">🇺🇦 {t("adminRooms.ukrainianSection")}</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name_uk">{t("adminRooms.nameUk")}</Label>
                  <Input id="name_uk" value={formData.name_uk} onChange={(e) => setFormData({ ...formData, name_uk: e.target.value })} placeholder="Назва українською" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_description_uk">{t("adminRooms.shortDescUk")}</Label>
                  <Input id="short_description_uk" value={formData.short_description_uk} onChange={(e) => setFormData({ ...formData, short_description_uk: e.target.value })} placeholder="Короткий опис українською" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_uk">{t("adminRooms.fullDescUk")}</Label>
                  <Textarea id="description_uk" value={formData.description_uk} onChange={(e) => setFormData({ ...formData, description_uk: e.target.value })} rows={4} placeholder="Повний опис українською" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenities_uk">{t("adminRooms.amenitiesUk")}</Label>
                  <Textarea id="amenities_uk" value={formData.amenities_uk} onChange={(e) => setFormData({ ...formData, amenities_uk: e.target.value })} rows={2} placeholder="WiFi, Кондиціонер, Міні-бар" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
              <Label htmlFor="is_active">{t("adminRooms.active")}</Label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t("adminRooms.save") : editingRoom ? t("adminRooms.updateRoom") : t("adminRooms.createRoom")}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog}>{t("adminRooms.cancel")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {photosRoom && (
        <RoomPhotosDialog
          open={!!photosRoom}
          onOpenChange={(open) => !open && setPhotosRoom(null)}
          roomTypeId={photosRoom.id}
          roomName={photosRoom.name}
        />
      )}
    </div>
  );
}
