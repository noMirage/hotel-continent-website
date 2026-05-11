import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Calendar,
  Inbox,
  BedDouble,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  UserCircle,
  Building2,
  Archive,
  BarChart3,
  BookOpen,
  UsersRound,
  PartyPopper,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsSuperAdmin, useIsOwner, useCurrentUserProfile } from "@/hooks/useUserRole";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import type { AppRole } from "@/lib/supabase-types";

// Items all roles can see
const baseNavItems: Array<{ href: string; labelKey: TranslationKey; icon: any }> = [
  { href: "/admin/dashboard",      labelKey: "admin.dashboard",     icon: LayoutDashboard },
  { href: "/admin/calendar",       labelKey: "admin.calendar",      icon: Calendar },
  { href: "/admin/bookings",       labelKey: "admin.bookings",      icon: Inbox },
  { href: "/admin/group-bookings", labelKey: "admin.groupBookings", icon: UsersRound },
  { href: "/admin/banquets",       labelKey: "admin.banquets",      icon: PartyPopper },
  { href: "/admin/promotions",     labelKey: "admin.promotions",    icon: Tag },
];

// Admin + Super Admin only
const adminNavItems: Array<{ href: string; labelKey: TranslationKey; icon: any }> = [
  { href: "/admin/rooms",      labelKey: "admin.rooms",      icon: BedDouble },
  { href: "/admin/room-units", labelKey: "admin.roomUnits",  icon: Building2 },
  { href: "/admin/profile",    labelKey: "admin.myProfile",  icon: UserCircle },
];

// Super Admin only
const superAdminNavItems: Array<{ href: string; labelKey: TranslationKey; icon: any }> = [
  { href: "/admin/users",   labelKey: "admin.users",   icon: Users },
  { href: "/admin/archive", labelKey: "admin.archive", icon: Archive },
];

// Owner only
const ownerNavItems: Array<{ href: string; labelKey: TranslationKey; icon: any }> = [
  { href: "/admin/owner-dashboard", labelKey: "admin.ownerDashboard", icon: LayoutDashboard },
  { href: "/admin/analytics",       labelKey: "admin.analytics",      icon: BarChart3 },
  { href: "/admin/calendar",        labelKey: "admin.calendar",        icon: Calendar },
  { href: "/admin/users",           labelKey: "admin.users",           icon: Users },
  { href: "/admin/archive",         labelKey: "admin.archive",         icon: Archive },
  { href: "/admin/settings",        labelKey: "admin.settings",        icon: Settings },
  { href: "/admin/guide",           labelKey: "admin.guide",           icon: BookOpen },
];

const settingsNavItem = { href: "/admin/settings", labelKey: "admin.settings" as TranslationKey, icon: Settings };
const guideNavItem    = { href: "/admin/guide",    labelKey: "admin.guide"    as TranslationKey, icon: BookOpen };

function roleLabel(role: AppRole, t: (k: string) => string): string {
  if (role === "super_admin") return t("admin.roleSuperAdmin");
  if (role === "viewer")      return t("admin.roleViewer");
  if (role === "owner")       return t("admin.roleOwner");
  return t("admin.roleAdmin");
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<AppRole>("admin");
  const { session, role, isLoading, isRoleLoading } = useAdminSession();
  const { hotelName } = useHotelSettings();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { data: currentProfile } = useCurrentUserProfile();
  const { language, setLanguage, t } = useLanguage();

  const { isOwner } = useIsOwner();
  const isViewer = userRole === "viewer";

  // Build nav based on role
  const navItems = isOwner ? ownerNavItems : [
    ...baseNavItems,
    ...(isViewer ? [] : adminNavItems),
    ...(isSuperAdmin ? superAdminNavItems : []),
    ...(isViewer ? [] : [settingsNavItem]),
    guideNavItem,
  ];

  const toggleLanguage = () => setLanguage(language === "en" ? "uk" : "en");

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      // Clear all cached query data so a subsequent login as a different user
      // never sees stale data from the previous session.
      queryClient.clear();
      navigate("/admin");
      return;
    }
    // Role is still being fetched from the DB — session is known, just wait
    if (isRoleLoading) return;
    if (!role) { supabase.auth.signOut().then(() => navigate("/admin")); return; }
    setUserRole(role);
  }, [isLoading, isRoleLoading, session, role, navigate, queryClient]);

  const handleLogout = async () => {
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/admin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-64 bg-card border-r border-border p-4">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ── Sidebar user badge ──────────────────────────────────────────────────────
  const UserBadge = () => (
    <div className="px-4 py-3 mb-2 rounded-lg bg-muted/50">
      <p className="text-sm font-semibold text-foreground truncate">
        {currentProfile?.fullName || currentProfile?.email?.split("@")[0] || "—"}
      </p>
      <p className="text-xs text-muted-foreground truncate">{currentProfile?.email}</p>
      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
        {roleLabel(currentProfile?.role ?? userRole, t)}
      </span>
    </div>
  );

  // ── Nav link ────────────────────────────────────────────────────────────────
  const NavLink = ({ item }: { item: typeof baseNavItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Icon className="h-5 w-5" />
        {t(item.labelKey)}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 flex-col bg-card border-r border-border z-30">
        <div className="p-6 border-b border-border">
          <Link to="/" className="font-serif text-lg font-bold text-foreground">
            {hotelName}
          </Link>
          <p className="text-xs text-muted-foreground mt-1">{t("admin.portal")}</p>
        </div>

        {/* Current user */}
        <div className="p-4 border-b border-border">
          <UserBadge />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <p className="text-center text-xs text-muted-foreground/50 pb-2">Powered by noMirage</p>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
          >
            <span className={`font-semibold ${language === "en" ? "text-primary" : "text-muted-foreground"}`}>EN</span>
            <span className="text-muted-foreground/40">|</span>
            <span className={`font-semibold ${language === "uk" ? "text-primary" : "text-muted-foreground"}`}>УК</span>
            <span className="ml-1 text-xs text-muted-foreground">{language === "en" ? "English" : "Українська"}</span>
          </button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {t("admin.signOut")}
          </Button>
        </div>
      </aside>

      {/* ── Mobile Header ─────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <Link to="/" className="font-serif text-lg font-bold text-foreground">
              {hotelName}
            </Link>
            {currentProfile?.fullName && (
              <p className="text-xs text-muted-foreground leading-none mt-0.5">{currentProfile.fullName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 p-2 text-sm rounded-md hover:bg-accent transition-colors"
              aria-label="Switch language"
            >
              <span className={language === "en" ? "font-bold text-primary text-xs" : "font-semibold text-muted-foreground text-xs"}>EN</span>
              <span className="text-muted-foreground/40 text-xs">|</span>
              <span className={language === "uk" ? "font-bold text-primary text-xs" : "font-semibold text-muted-foreground text-xs"}>УК</span>
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="p-4 border-t border-border space-y-1">
            <UserBadge />
            {navItems.map((item) => <NavLink key={item.href} item={item} />)}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground mt-4"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {t("admin.signOut")}
            </Button>
          </nav>
        )}
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-hidden lg:pt-0 pt-16 lg:ml-64">
        <div className="p-6 md:p-8">
          <div key={location.pathname} className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
