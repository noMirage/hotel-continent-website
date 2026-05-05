import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Calendar, DollarSign, TrendingUp, Clock, CalendarIcon, User, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hotelConfig } from "@/config/hotel";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAdminProfile, useAdminProfileStats } from "@/hooks/useAdminProfileData";
import { useAdminProfileMutation } from "@/hooks/useAdminProfileMutation";

type DateRange = "today" | "week" | "month" | "year" | "custom";

export default function AdminProfile() {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const [selectedRange, setSelectedRange] = useState<DateRange>("month");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const getDateRange = () => {
    switch (selectedRange) {
      case "today": return { start: startOfDay(new Date()), end: endOfDay(new Date()) };
      case "week": return { start: startOfWeek(new Date()), end: endOfWeek(new Date()) };
      case "month": return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
      case "year": return { start: startOfYear(new Date()), end: endOfYear(new Date()) };
      case "custom":
        if (customStart && customEnd) return { start: startOfDay(customStart), end: endOfDay(customEnd) };
        return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
      default: return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
    }
  };

  const { start, end } = getDateRange();

  const { data: profile, isLoading: profileLoading } = useAdminProfile();
  const { data: uniqueBookings, isLoading: statsLoading } = useAdminProfileStats(
    profile?.userId,
    start.toISOString(),
    end.toISOString(),
  );

  const updateNameMutation = useAdminProfileMutation({
    onUpdateSuccess: () => setIsEditingName(false),
  });

  const stats = useMemo(() => {
    if (!uniqueBookings || !profile) return null;

    const rateManual = (profile as any).commission_rate_manual ?? 5.0;
    const rateSite   = (profile as any).commission_rate_site   ?? 3.0;

    const checkinBookings = uniqueBookings.filter(b => b.status === "CHECK_IN" || b.status === "CHECK_OUT");
    const earnedRevenue   = checkinBookings.reduce((s, b) => s + Number(b.total_price), 0);
    const estimatedRevenue = uniqueBookings
      .filter(b => b.status === "CONFIRMED")
      .reduce((s, b) => s + Number(b.total_price) * 0.5, 0);

    const manualCheckin  = checkinBookings.filter(b => b.booking_source === "ADMIN");
    const siteCheckin    = checkinBookings.filter(b => b.booking_source !== "ADMIN");
    const manualEarned   = manualCheckin.reduce((s, b) => s + Number(b.total_price) * (rateManual / 100), 0);
    const siteEarned     = siteCheckin.reduce((s, b) => s + Number(b.total_price) * (rateSite / 100), 0);
    const earnedCommission = manualEarned + siteEarned;

    const manualConfirmed = uniqueBookings.filter(b => b.status === "CONFIRMED" && b.booking_source === "ADMIN");
    const siteConfirmed   = uniqueBookings.filter(b => b.status === "CONFIRMED" && b.booking_source !== "ADMIN");
    const estimatedCommission =
      manualConfirmed.reduce((s, b) => s + Number(b.total_price) * 0.5 * (rateManual / 100), 0) +
      siteConfirmed.reduce((s, b) => s + Number(b.total_price) * 0.5 * (rateSite / 100), 0);

    return {
      totalBookings: uniqueBookings.length,
      confirmedBookings: uniqueBookings.filter(b => ["CONFIRMED","CHECK_IN","CHECK_OUT"].includes(b.status)).length,
      pendingBookings: uniqueBookings.filter(b => b.status === "UNPROCESSED" || b.status === "PENDING").length,
      earnedRevenue, estimatedRevenue, earnedCommission, estimatedCommission,
      manualEarned, siteEarned, rateManual, rateSite,
      manualBookings: uniqueBookings.filter(b => b.booking_source === "ADMIN").length,
      siteBookings:   uniqueBookings.filter(b => b.booking_source !== "ADMIN").length,
    };
  }, [uniqueBookings, profile]);

  const isLoading = profileLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-32 w-full" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>
          <p className="text-muted-foreground">{profile?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedRange} onValueChange={(v) => setSelectedRange(v as DateRange)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("profile.today")}</SelectItem>
              <SelectItem value="week">{t("profile.thisWeek")}</SelectItem>
              <SelectItem value="month">{t("profile.thisMonth")}</SelectItem>
              <SelectItem value="year">{t("profile.thisYear")}</SelectItem>
              <SelectItem value="custom">{t("profile.customRange")}</SelectItem>
            </SelectContent>
          </Select>
          {selectedRange === "custom" && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(!customStart && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStart ? format(customStart, "PP", { locale: dateLocale }) : t("profile.start")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker mode="single" selected={customStart} onSelect={setCustomStart} locale={dateLocale} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(!customEnd && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEnd ? format(customEnd, "PP", { locale: dateLocale }) : t("profile.end")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker mode="single" selected={customEnd} onSelect={setCustomEnd} locale={dateLocale} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> {t("profile.info")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("profile.name")}</p>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    className="h-8 text-sm"
                    placeholder={t("profile.namePlaceholder")}
                    autoFocus
                  />
                  <Button size="sm" className="h-8" onClick={() => updateNameMutation.mutate(editNameValue)} disabled={updateNameMutation.isPending}>
                    {updateNameMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t("profile.save")}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsEditingName(false)}>{t("profile.cancelEdit")}</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{profile?.full_name || t("profile.notSet")}</p>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditNameValue(profile?.full_name || ""); setIsEditingName(true); }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("profile.email")}</p>
              <p className="font-medium text-foreground">{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("profile.commissionManual")}</p>
              <p className="font-medium text-foreground">{stats?.rateManual ?? 5}%</p>
              <p className="text-xs text-muted-foreground">{t("profile.commissionManualDesc")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("profile.commissionSite")}</p>
              <p className="font-medium text-foreground">{stats?.rateSite ?? 3}%</p>
              <p className="text-xs text-muted-foreground">{t("profile.commissionSiteDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("profile.totalBookings")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalBookings || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("profile.confirmedCount", { count: String(stats?.confirmedBookings || 0) })}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("profile.earnedRevenue")}</p>
                <p className="text-3xl font-bold text-foreground">{hotelConfig.currencySymbol}{Math.round(stats?.earnedRevenue ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("profile.estimatedRevenue")}: {hotelConfig.currencySymbol}{Math.round(stats?.estimatedRevenue ?? 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("profile.commissionEarned")}</p>
                <p className="text-3xl font-bold text-foreground">{hotelConfig.currencySymbol}{(stats?.earnedCommission ?? 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("profile.manualEarned")}: {hotelConfig.currencySymbol}{(stats?.manualEarned ?? 0).toFixed(2)} ({stats?.rateManual ?? 5}%)
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("profile.siteEarned")}: {hotelConfig.currencySymbol}{(stats?.siteEarned ?? 0).toFixed(2)} ({stats?.rateSite ?? 3}%)
                </p>
                <p className="text-xs text-muted-foreground">{t("profile.estimatedCommission")}: {hotelConfig.currencySymbol}{(stats?.estimatedCommission ?? 0).toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("profile.pendingReview")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.pendingBookings || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("profile.awaitingConfirmation")}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.bookingSources")}</CardTitle>
          <CardDescription>{t("profile.sourcesDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("profile.manualBookings")}</p>
              <p className="text-2xl font-bold text-foreground">{stats?.manualBookings || 0}</p>
              <p className="text-xs text-muted-foreground">{t("profile.walkInPhone")}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("profile.websiteBookings")}</p>
              <p className="text-2xl font-bold text-foreground">{stats?.siteBookings || 0}</p>
              <p className="text-xs text-muted-foreground">{t("profile.onlineReservations")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
