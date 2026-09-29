"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Seul un chemin interne est accepté : « //site.com » ou « https://… » renverraient
// vers un site tiers (redirection ouverte).
function safeNextPath(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n]/.test(next)) return "/dashboard";
  return next;
}

export async function acknowledgeWelcome(formData: FormData) {
  const next = safeNextPath(formData.get("next"));

  cookies().set("rhpilot_welcome_seen", "1", {
    maxAge: 60 * 60 * 24 * 365, // un an — "une fois pour toutes", pas juste la session
    path: "/",
  });

  redirect(next);
}
