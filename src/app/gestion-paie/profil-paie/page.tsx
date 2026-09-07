import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Profil de paie, RH Pilot", description: "Salaire, temps de travail, contrat, classification et convention collective regroupés dans le profil de paie." };
export default function ProfilPaiePage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.profile} />; }
