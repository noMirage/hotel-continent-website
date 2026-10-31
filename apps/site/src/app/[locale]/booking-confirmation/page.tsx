import type { Metadata } from "next";
import { Suspense } from "react";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import BookingConfirmationView from "@/views/BookingConfirmation";

export async function generateMetadata({ params }: PageProps<"/[locale]/booking-confirmation">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return pageMetadata({ locale, path: "/booking-confirmation", titleKey: "booking.submitted", noindex: true });
}

export default function Page() {
  // The view reads the booking summary from the query string (useSearchParams)
  return (
    <Suspense>
      <BookingConfirmationView />
    </Suspense>
  );
}
