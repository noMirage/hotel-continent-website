import { CalendarRoomManager } from "@/components/admin/CalendarRoomManager";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRoomUnitsSummary } from "@/hooks/useAdminRoomUnitsData";
import { BedDouble, Building2 } from "lucide-react";

export default function AdminRoomUnits() {
  const { t } = useLanguage();

  const { data: summary } = useRoomUnitsSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("roomManager.title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("roomManager.pageSubtitle")}</p>
          {summary && (
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <BedDouble className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{summary.active}</span> {t("roomManager.activeRooms")}
              </span>
              {summary.total !== summary.active && (
                <span className="text-sm text-muted-foreground">
                  ({summary.total - summary.active} {t("roomManager.inactive")})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <CalendarRoomManager />
    </div>
  );
}
