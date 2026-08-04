import { redirect } from "next/navigation";

// Cette page a fusionné avec /dashboard/organization — redirection
// permanente pour ne jamais casser un lien ou un signet existant.
export default function SettingsRedirect() {
  redirect("/dashboard/organization");
}
