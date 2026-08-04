import { redirect } from "next/navigation";

// Renommée en /dashboard/configuration, plus précis que "Organisation"
// (qui pouvait laisser croire à un organigramme ou des établissements).
export default function OrganizationRedirect() {
  redirect("/dashboard/configuration");
}
