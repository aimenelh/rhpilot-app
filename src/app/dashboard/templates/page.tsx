import { redirect } from "next/navigation";

// Cette page a fusionné avec /dashboard/configuration — redirection
// permanente pour ne jamais casser un lien ou un signet existant.
export default function TemplatesRedirect() {
  redirect("/dashboard/configuration");
}
