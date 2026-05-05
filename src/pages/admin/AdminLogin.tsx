import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAdminLogin } from "@/hooks/useAdminLogin";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { session, role, isLoading: isCheckingAuth } = useAdminSession();
  const { hotelName } = useHotelSettings();

  const { login, isLoading } = useAdminLogin({
    onSuccess: (r) => navigate(r === "owner" ? "/admin/owner-dashboard" : "/admin/dashboard"),
  });

  useEffect(() => {
    if (isCheckingAuth) return;
    if (session && role) {
      navigate(role === "owner" ? "/admin/owner-dashboard" : "/admin/dashboard");
    }
  }, [isCheckingAuth, session, role, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-6 duration-500">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">{hotelName}</CardTitle>
          <CardDescription>{t("adminLogin.title")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("adminLogin.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@continent.ua" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("adminLogin.password")}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("adminLogin.signingIn")}</>) : t("adminLogin.signIn")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">{t("adminLogin.needAccess")}</p>
          <div className="text-center mt-4">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> {t("adminLogin.backHome")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
