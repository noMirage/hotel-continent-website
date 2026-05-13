import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Users, DollarSign, TrendingUp, Clock, ChevronDown, AlertCircle, UsersRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hotelConfig } from "@/config/hotel";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { format } from "date-fns";
import { fromLocalDateString } from "@/lib/date-utils";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";
import { statusBadgeClass } from "@/lib/booking-status";
import { useAdminDashboardStats, useAdminDashboardGroupStats } from "@/hooks/useAdminDashboardData";
import type { RevPeriod } from "@/hooks/useAdminDashboardData";

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const { hotelName } = useHotelSettings();
  const navigate = useNavigate();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const [visibleCount, setVisibleCount] = useState(10);
  const [page, setPage] = useState(0);
  const [revPeriod, setRevPeriod] = useState<RevPeriod>("month");
  const PAGE_SIZE = 10;

  const { data: stats, isLoading } = useAdminDashboardStats(revPeriod);
  const { data: groupStats } = useAdminDashboardGroupStats(revPeriod);

  const statusText = (s: string) => {
    switch (s) {
      case "UNPROCESSED": return t("bookings.unprocessed");
      case "CHECK_IN":    return t("bookings.checkInStatus");
      case "CHECK_OUT":   return t("bookings.checkOutStatus");
      case "PENDING":     return t("bookings.pending");
      case "CONFIRMED":   return t("bookings.confirmed");
      case "DECLINED":    return t("bookings.declined");
      case "CANCELLED":   return t("bookings.cancelled");
      default: return s;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.welcome", { name: hotelName })}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Unprocessed */}
        <Card
          className="border-orange-200 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: "0ms" }}
          onClick={() => navigate("/admin/bookings")}
          title={t("dashboard.unprocessed")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.unprocessed")}</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.unprocessed ?? 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card
          className="cursor-pointer hover:shadow-md hover:border-border/80 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: "60ms" }}
          onClick={() => navigate("/admin/bookings")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.pendingBookings")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.pending ?? 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmed */}
        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: "120ms" }}
          onClick={() => navigate("/admin/bookings")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.confirmed")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.confirmed ?? 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today check-ins */}
        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: "180ms" }}
          onClick={() => navigate("/admin/bookings")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.todayCheckIns")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.todayCheckIns ?? 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earned revenue (period) */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-muted-foreground">{t("dashboard.earnedRevenue")}</p>
                  <Select value={revPeriod} onValueChange={(v) => setRevPeriod(v as RevPeriod)}>
                    <SelectTrigger className="h-6 w-24 text-xs px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t("profile.today")}</SelectItem>
                      <SelectItem value="week">{t("profile.thisWeek")}</SelectItem>
                      <SelectItem value="month">{t("profile.thisMonth")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {hotelConfig.currencySymbol}{Math.round(stats?.earnedRevenue ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.fromCheckIn")}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Group stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.groupPending")}</p>
                <p className="text-3xl font-bold text-foreground">{groupStats?.groupPending ?? 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <UsersRound className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.groupCheckIns")}</p>
                <p className="text-3xl font-bold text-foreground">{groupStats?.groupCheckIns ?? 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <UsersRound className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground mb-1">{t("dashboard.groupRevenue")}</p>
                <p className="text-2xl font-bold text-foreground">
                  {hotelConfig.currencySymbol}{Math.round(groupStats?.groupRevenue ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.fromGroupCheckIn")}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent bookings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("dashboard.recentBookings")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentBookings && stats.recentBookings.length > 0 ? (() => {
            const total = stats.recentBookings.length;
            const allRevealed = visibleCount >= total;
            const usePaging = allRevealed && total > 10;
            const totalPages = usePaging ? Math.ceil(total / PAGE_SIZE) : 1;
            const displayedBookings = usePaging
              ? stats.recentBookings.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
              : stats.recentBookings.slice(0, visibleCount);
            return (
              <div className="space-y-3">
                {displayedBookings.map((booking) => (
                  <div key={`${booking.type}-${booking.id}`} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{booking.name}</p>
                        {booking.type === "group" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0 flex items-center gap-1">
                            <UsersRound className="h-3 w-3" />{t("dashboard.groupLabel")}
                          </span>
                        )}
                        {booking.type === "regular" && booking.source === "SITE" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">Web</span>
                        )}
                        {booking.type === "regular" && booking.source === "AI" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex-shrink-0">AI</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(fromLocalDateString(booking.checkIn), "dd MMM", { locale: dateLocale })} – {format(fromLocalDateString(booking.checkOut), "dd MMM yyyy", { locale: dateLocale })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(booking.status)}`}>
                        {statusText(booking.status)}
                      </span>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {hotelConfig.currencySymbol}{booking.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Show-more button (while not all revealed) */}
                {!allRevealed && (
                  <div className="text-center pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setVisibleCount(v => Math.min(v + 5, total))}>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      {t("dashboard.showMore", { count: String(Math.min(5, total - visibleCount)) })}
                    </Button>
                  </div>
                )}

                {/* Pagination (once all are revealed and total > 10) */}
                {usePaging && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      ‹
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Button
                        key={i}
                        variant={page === i ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0 text-xs"
                        onClick={() => setPage(i)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      ›
                    </Button>
                  </div>
                )}
              </div>
            );
          })() : (
            <p className="text-center text-muted-foreground py-8">{t("dashboard.noBookings")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
