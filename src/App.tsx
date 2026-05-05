import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { LanguageProvider } from "@/i18n/LanguageContext";

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout";
import AdminLayout from "@/components/admin/AdminLayout";

// Public Pages
import Index from "./pages/Index";
import Rooms from "./pages/Rooms";
import RoomDetails from "./pages/RoomDetails";
import BookingConfirmation from "./pages/BookingConfirmation";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Policies from "./pages/Policies";
import NotFound from "./pages/NotFound";
import Leisure from "./pages/Leisure";
import Banquet from "./pages/Banquet";

// Admin Pages (lazy-loaded — each chunk is only fetched when the route is visited)
const AdminLogin          = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard      = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBookings       = lazy(() => import("./pages/admin/AdminBookings"));
const AdminCalendar       = lazy(() => import("./pages/admin/AdminCalendar"));
const AdminRooms          = lazy(() => import("./pages/admin/AdminRooms"));
const AdminSettings       = lazy(() => import("./pages/admin/AdminSettings"));
const AdminUsers          = lazy(() => import("./pages/admin/AdminUsers"));
const AdminProfile        = lazy(() => import("./pages/admin/AdminProfile"));
const AdminRoomUnits      = lazy(() => import("./pages/admin/AdminRoomUnits"));
const AdminArchive        = lazy(() => import("./pages/admin/AdminArchive"));
const AdminOwnerDashboard = lazy(() => import("./pages/admin/AdminOwnerDashboard"));
const AdminAnalytics      = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminGuide          = lazy(() => import("./pages/admin/AdminGuide"));
const AdminGroupBookings  = lazy(() => import("./pages/admin/AdminGroupBookings"));
const AdminBanquets       = lazy(() => import("./pages/admin/AdminBanquets"));
const AdminPromotions     = lazy(() => import("./pages/admin/AdminPromotions"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // data stays fresh for 5 min
      gcTime: 15 * 60 * 1000,         // keep unused cache for 15 min
      retry: 1,                        // fail faster on error (default 3 causes cascading slowness)
      refetchOnWindowFocus: false,     // don't cascade-refetch on every tab switch
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          }>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/rooms/:slug" element={<RoomDetails />} />
              <Route path="/booking-confirmation" element={<BookingConfirmation />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/leisure" element={<Leisure />} />
              <Route path="/banquet" element={<Banquet />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/calendar" element={<AdminCalendar />} />
              <Route path="/admin/rooms" element={<AdminRooms />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/room-units" element={<AdminRoomUnits />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/archive" element={<AdminArchive />} />
              <Route path="/admin/owner-dashboard" element={<AdminOwnerDashboard />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/guide" element={<AdminGuide />} />
              <Route path="/admin/group-bookings" element={<AdminGroupBookings />} />
              <Route path="/admin/banquets" element={<AdminBanquets />} />
              <Route path="/admin/promotions" element={<AdminPromotions />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
