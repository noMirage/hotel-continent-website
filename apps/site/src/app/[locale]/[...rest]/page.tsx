import { notFound } from "next/navigation";

// Any unknown path under a locale renders the localized 404 (app/[locale]/not-found.tsx).
export default function CatchAll() {
  notFound();
}
