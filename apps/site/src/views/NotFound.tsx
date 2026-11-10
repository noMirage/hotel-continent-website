"use client";

import { Link, useLocation } from "@/i18n/navigation";
import { useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.title")}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {t("notFound.return")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
