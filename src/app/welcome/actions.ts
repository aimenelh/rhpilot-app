"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function acknowledgeWelcome(formData: FormData) {
  const next = String(formData.get("next") || "/");

  cookies().set("rhpilot_welcome_seen", "1", {
    maxAge: 60 * 60 * 24 * 365, // un an — "une fois pour toutes", pas juste la session
    path: "/",
  });

  redirect(next);
}
