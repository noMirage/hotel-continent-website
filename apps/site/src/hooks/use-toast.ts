"use client";

import type { ReactNode } from "react";
import { toast as sonner } from "sonner";

// The ported components call the shadcn `useToast()` API; on the site it is backed by sonner.
interface ToastInput {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive";
}

export function toast({ title, description, variant }: ToastInput) {
  const show = variant === "destructive" ? sonner.error : sonner.success;
  show(title as string, { description });
}

export function useToast() {
  return { toast };
}
