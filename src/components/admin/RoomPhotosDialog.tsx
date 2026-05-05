import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";

interface RoomPhoto {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean | null;
}

interface RoomPhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTypeId: string;
  roomName: string;
}

export function RoomPhotosDialog({ open, onOpenChange, roomTypeId, roomName }: RoomPhotosDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: photos, isLoading } = useQuery({
    queryKey: QK.roomPhotos(roomTypeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_media")
        .select("id,url,alt_text,is_primary")
        .eq("room_type_id", roomTypeId)
        .order("sort_order");
      if (error) throw error;
      return data as RoomPhoto[];
    },
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (photo: RoomPhoto) => {
      const urlParts = photo.url.split("/room-images/");
      if (urlParts[1]) {
        await supabase.storage.from("room-images").remove([urlParts[1]]);
      }
      const { error } = await supabase.from("room_media").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.roomPhotos(roomTypeId) });
      toast({ title: t("adminRooms.photoDeleted") });
    },
    onError: (err: any) => { console.error(err); toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" }); },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await supabase.from("room_media").update({ is_primary: false }).eq("room_type_id", roomTypeId);
      const { error } = await supabase.from("room_media").update({ is_primary: true }).eq("id", photoId);
      if (error) throw error;
      const photo = photos?.find(p => p.id === photoId);
      if (photo) {
        await supabase.from("room_types").update({ image_url: photo.url }).eq("id", roomTypeId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.roomPhotos(roomTypeId) });
      queryClient.invalidateQueries({ queryKey: QK.adminRoomTypes() });
      toast({ title: t("adminRooms.primaryUpdated") });
    },
    onError: (err: any) => { console.error(err); toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" }); },
  });

  const MAX_PHOTOS = 10;
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = photos?.length ?? 0;
    const allowedCount = Math.max(0, MAX_PHOTOS - currentCount);
    if (allowedCount === 0) {
      toast({ title: t("adminRooms.photoLimitReached"), description: t("adminRooms.photoLimitDesc"), variant: "destructive" });
      e.target.value = "";
      return;
    }

    // Validate before uploading — filter by MIME type and file size
    const candidates = Array.from(files).slice(0, allowedCount);
    const badType = candidates.filter(f => !ALLOWED_MIME_TYPES.includes(f.type));
    const badSize = candidates.filter(f => ALLOWED_MIME_TYPES.includes(f.type) && f.size > MAX_FILE_SIZE_BYTES);
    const filesToUpload = candidates.filter(f => ALLOWED_MIME_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE_BYTES);

    if (badType.length > 0) {
      toast({ title: t("adminRooms.invalidFileType"), description: t("adminRooms.invalidFileTypeDesc"), variant: "destructive" });
    }
    if (badSize.length > 0) {
      toast({ title: t("adminRooms.fileTooLarge"), description: t("adminRooms.fileTooLargeDesc", { maxMb: String(MAX_FILE_SIZE_MB) }), variant: "destructive" });
    }
    if (filesToUpload.length === 0) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const ext = file.name.split(".").pop();
        const path = `${roomTypeId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("room-images").upload(path, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("room-images").getPublicUrl(path);

        const isPrimary = currentCount === 0 && i === 0;
        const { error: insertError } = await supabase.from("room_media").insert({
          room_type_id: roomTypeId,
          url: publicUrl,
          alt_text: roomName,
          is_primary: isPrimary,
          sort_order: currentCount + i,
        });
        if (insertError) throw insertError;

        if (isPrimary) {
          await supabase.from("room_types").update({ image_url: publicUrl }).eq("id", roomTypeId);
        }
      }

      queryClient.invalidateQueries({ queryKey: QK.roomPhotos(roomTypeId) });
      queryClient.invalidateQueries({ queryKey: QK.adminRoomTypes() });
      const uploaded = filesToUpload.length;
      const skippedLimit = files.length - candidates.length;
      toast({
        title: t("adminRooms.photosUploaded"),
        description: `${uploaded} ${t("adminRooms.photosAdded")}` +
          (skippedLimit > 0 ? ` (${skippedLimit} ${t("adminRooms.photosSkippedLimit", { max: String(MAX_PHOTOS) })})` : ""),
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: t("adminRooms.uploadFailed"), description: t("common.unexpectedError"), variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("adminRooms.photosTitle")} — {roomName}</DialogTitle>
          <DialogDescription>{t("adminRooms.photosDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload */}
          <div className="flex items-center gap-3">
            <Label
              htmlFor="photo-upload"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted transition-colors text-sm",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? t("adminRooms.uploading") : t("adminRooms.uploadPhotos")}
            </Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </div>

          {/* Photo grid */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("adminRooms.loadingPhotos")}</p>
          ) : photos && photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative rounded-lg overflow-hidden border-2 group",
                    photo.is_primary ? "border-primary" : "border-border"
                  )}
                >
                  <img
                    src={photo.url}
                    alt={photo.alt_text || "Room photo"}
                    className="w-full h-32 object-cover"
                  />
                  {photo.is_primary && (
                    <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                      {t("adminRooms.primary")}
                    </span>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!photo.is_primary && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => setPrimaryMutation.mutate(photo.id)}
                        title={t("adminRooms.setAsPrimary")}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      onClick={() => deleteMutation.mutate(photo)}
                      title={t("adminRooms.deletePhoto")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("adminRooms.noPhotos")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
