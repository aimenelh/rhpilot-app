// Types et bornes du bulletin de démonstration, sans le moteur : ce module est
// importé par le composant client, qui ne doit pas embarquer le modèle social.

export type DemoInput = {
  gross: number;
  cadre: boolean;
  healthMonthly: number;
  healthEmployerRate: number;
  atmpRate: number;
};

export const DEFAULT_DEMO_INPUT: DemoInput = { gross: 2500, cadre: false, healthMonthly: 60, healthEmployerRate: 50, atmpRate: 2.08 };
export const DEMO_LIMITS = { grossMin: 1823, grossMax: 6000, atmpMin: 0.5, atmpMax: 6 };

export type DemoReference = { title: string; href: string };
export type DemoSide = { amount: number; rate: number | null };
export type DemoRow = {
  key: string;
  label: string;
  base: number | null;
  employee: DemoSide | null;
  employer: DemoSide | null;
  sourceRule: string;
  references: DemoReference[];
};
export type DemoGroup = { title: string; rows: DemoRow[] };
export type DemoResult = {
  input: DemoInput;
  groups: DemoGroup[];
  gross: number;
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;
  netSocial: number;
  netTaxable: number;
  employerCost: number;
  modelVersion: string;
};

export function clampDemoInput(input: DemoInput): DemoInput {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  return {
    gross: Math.round(clamp(input.gross, DEMO_LIMITS.grossMin, DEMO_LIMITS.grossMax) * 100) / 100,
    cadre: Boolean(input.cadre),
    healthMonthly: clamp(input.healthMonthly, 20, 200),
    healthEmployerRate: clamp(input.healthEmployerRate, 50, 100),
    atmpRate: clamp(input.atmpRate, DEMO_LIMITS.atmpMin, DEMO_LIMITS.atmpMax),
  };
}
