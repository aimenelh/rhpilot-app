import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Référentiel conventionnel, RH Pilot", description: "Convention collective, versions et règles conventionnelles prises en compte dans les traitements couverts par RH Pilot." };
export default function ReferentielConventionnelPage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.agreement} />; }
