import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldHint } from "@/components/ui/Field";
import { updateOrganizationSettings } from "../../settings/organizationActions";

export const dynamic = "force-dynamic";

const COMMON_CCN = ["Syntec", "Métallurgie", "Commerce de gros", "Commerce de détail et de gros à prédominance alimentaire", "HCR (Hôtels, cafés, restaurants)", "Bâtiment et travaux publics (BTP)", "Pharmacie d'officine", "Banque", "Assurance", "Transport routier", "Immobilier", "Bureaux d'études techniques", "Cabinets d'avocats", "Cabinets d'experts-comptables", "Coiffure", "Aide à domicile", "Sport", "Animation", "Publicité", "Industrie pharmaceutique", "Automobile (services)", "Bricolage", "Restauration rapide", "Propreté", "Sécurité privée", "Textile", "Notariat", "Optique-lunetterie", "Import-export", "Édition"];
const LEGAL_CATEGORIES = ["EI", "SARL", "SAS", "SELARL", "SELAS", "association", "autre"] as const;

type OrganisationConfigPageProps = { searchParams?: { saved?: string } };

export default async function OrganisationConfigPage({ searchParams }: OrganisationConfigPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const canEditOrganization = membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const organization = await prisma.organization.findUnique({ where: { id: membership.organizationId } });
  const socialRows = await prisma.$queryRaw<Array<{ legalCategory: string | null; atmpRate: unknown; healthPlanMonthlyAmount: unknown; healthPlanEmployerRate: unknown }>>`SELECT "legalCategory", "atmpRate", "healthPlanMonthlyAmount", "healthPlanEmployerRate" FROM "organizations" WHERE "id" = ${membership.organizationId} LIMIT 1`;
  const legalCategory = socialRows[0]?.legalCategory ?? "";
  const atmpRate = socialRows[0]?.atmpRate === null || socialRows[0]?.atmpRate === undefined ? "" : String(socialRows[0].atmpRate);
  const healthPlanMonthlyAmount = socialRows[0]?.healthPlanMonthlyAmount === null || socialRows[0]?.healthPlanMonthlyAmount === undefined ? "" : String(socialRows[0].healthPlanMonthlyAmount);
  const healthPlanEmployerRate = socialRows[0]?.healthPlanEmployerRate === null || socialRows[0]?.healthPlanEmployerRate === undefined ? "" : String(socialRows[0].healthPlanEmployerRate);
  const saved = cookies().get("rhpilot-organization-saved")?.value === "1" || searchParams?.saved === "1";

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/configuration" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-ink"><ArrowLeft size={14} /> Configuration</Link>
      <h1 className="mt-3 text-2xl font-semibold text-ink">Organisation</h1>
      <p className="mt-1 text-sm text-ink-soft">Votre rôle RH, les paramètres sociaux et la convention collective applicable.</p>
      {saved && <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">✓ Modifications enregistrées.</div>}

      <form action={updateOrganizationSettings}>
        <Card className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Votre rôle dans l&apos;organisation</h2>
          <p className="mt-1 text-sm text-ink-soft">Certaines tâches des parcours RH sont conçues pour être assignées automatiquement à &laquo;&nbsp;la personne RH&nbsp;&raquo; de l&apos;organisation. RH Pilot ne devine jamais qui occupe ce rôle.</p>
          <div className="mt-4"><Label htmlFor="functionalRole">Mon rôle</Label><Select id="functionalRole" name="functionalRole" defaultValue={membership.functionalRole ?? ""}><option value="">Non renseigné</option><option value="RH">RH</option><option value="DIRIGEANT">Dirigeant</option></Select><FieldHint>Si plusieurs personnes sont marquées &laquo;&nbsp;RH&nbsp;&raquo;, l&apos;assignation automatique reste désactivée.</FieldHint></div>
        </Card>

        {canEditOrganization && (<>
          <Card className="mt-4">
            <h2 className="text-sm font-semibold text-ink">Paramètres sociaux de l&apos;organisation</h2>
            <p className="mt-1 text-sm text-ink-soft">Ces données sont renseignées explicitement. RH Pilot ne les déduit pas du nom, du SIRET ou d&apos;autres indices.</p>
            <div className="mt-4"><Label htmlFor="legalCategory">Forme juridique</Label><Select id="legalCategory" name="legalCategory" defaultValue={legalCategory}><option value="">Non renseignée</option>{LEGAL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</Select><FieldHint>Utilisée par le moteur social uniquement lorsqu&apos;elle est explicitement renseignée.</FieldHint></div>
            <div className="mt-6"><Label htmlFor="atmpRate">Taux AT/MP de l&apos;établissement (%)</Label><Input id="atmpRate" name="atmpRate" type="number" min="0" max="100" step="0.01" defaultValue={atmpRate} placeholder="Ex. 2,08" /><FieldHint>Renseignez le taux figurant sur votre notification de taux AT/MP. RH Pilot ne l&apos;estime pas et n&apos;utilise pas le taux moyen national comme valeur par défaut.</FieldHint></div>
            <div className="mt-6"><Label htmlFor="healthPlanMonthlyAmount">Montant mensuel de la complémentaire santé (€)</Label><Input id="healthPlanMonthlyAmount" name="healthPlanMonthlyAmount" type="number" min="0.01" max="10000" step="0.01" defaultValue={healthPlanMonthlyAmount} placeholder="Ex. 40" /><FieldHint>Indiquez le montant mensuel prévu par le contrat de complémentaire santé de l&apos;organisation.</FieldHint><Label htmlFor="healthPlanEmployerRate" className="mt-4">Part employeur (%)</Label><Input id="healthPlanEmployerRate" name="healthPlanEmployerRate" type="number" min="50" max="100" step="0.01" defaultValue={healthPlanEmployerRate} placeholder="Ex. 50" /><FieldHint>La part employeur de la complémentaire santé doit être d&apos;au moins 50 %.</FieldHint></div>
          </Card>

          <Card className="mt-4">
            <h2 className="text-sm font-semibold text-ink">Convention collective</h2>
            <p className="mt-1 text-sm text-ink-soft">Renseignez celle applicable à votre organisation. RH Pilot vous orientera alors vers la bonne source officielle au bon moment.</p>
            <div className="mt-4"><Label htmlFor="conventionCollective">Nom de la convention collective</Label><Input id="conventionCollective" name="conventionCollective" list="ccn-suggestions" defaultValue={organization?.conventionCollective ?? ""} placeholder="Ex. Syntec" /><datalist id="ccn-suggestions">{COMMON_CCN.map((ccn) => <option key={ccn} value={ccn} />)}</datalist><FieldHint>Tapez pour voir des suggestions parmi les conventions les plus courantes, ou indiquez la vôtre librement.</FieldHint></div>
          </Card>
        </>)}

        <div className="mt-6 flex justify-end">
          <Button type="submit">Enregistrer les modifications</Button>
        </div>
      </form>
    </div>
  );
}
