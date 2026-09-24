import { ServicesExperience } from "@/components/landing/ServicesExperience";
import { SoftwareOverview } from "@/components/landing/SoftwareOverview";
export const metadata = {
  title: "Le logiciel RH Pilot : salariés, parcours et échéances",
  description:
    "Découvrez RH Pilot : dossiers salariés, parcours RH, documents, calendrier, rappels et copilote. Explorez le logiciel dans une démonstration guidée.",
  alternates: { canonical: "/services" },
};
export default function ServicesPage({
  searchParams,
}: {
  searchParams: { demo?: string };
}) {
  return searchParams.demo === "1" ? (
    <ServicesExperience />
  ) : (
    <SoftwareOverview />
  );
}
