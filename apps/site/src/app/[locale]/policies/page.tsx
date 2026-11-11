import type { Metadata } from "next";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import PoliciesView from "@/views/Policies";

export async function generateMetadata({ params }: PageProps<"/[locale]/policies">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return pageMetadata({ locale, path: "/policies", titleKey: "policies.title" });
}

export default function Page() {
  return <PoliciesView />;
}
