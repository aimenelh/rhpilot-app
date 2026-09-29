"use client";

import { useMemo, useState, useTransition } from "react";
import { suggestNafConventions } from "./nafActions";
import { Input, Label, FieldHint } from "@/components/ui/Field";

type Agreement = { id: string; idcc: string; name: string };

const KNOWN_AGREEMENTS: Agreement[] = [
  {
    id: "ccn-1486",
    idcc: "1486",
    name: "Bureaux d'études techniques, cabinets d'ingénieurs-conseils et sociétés de conseils (Syntec)",
  },
  { id: "ccn-3248", idcc: "3248", name: "Métallurgie" },
  { id: "ccn-0573", idcc: "0573", name: "Commerces de gros" },
  { id: "ccn-2216", idcc: "2216", name: "Commerce de détail et de gros à prédominance alimentaire" },
  { id: "ccn-1979", idcc: "1979", name: "Hôtels, cafés, restaurants (HCR)" },
  { id: "ccn-1996", idcc: "1996", name: "Pharmacie d'officine" },
];

function mergeAgreements(agreements: Agreement[]) {
  const byIdcc = new Map<string, Agreement>();
  for (const agreement of [...KNOWN_AGREEMENTS, ...agreements]) byIdcc.set(agreement.idcc, agreement);
  return [...byIdcc.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function CollectiveAgreementFields({
  agreements,
  defaultIdcc,
  defaultName,
  defaultNaf = "",
}: {
  agreements: Agreement[];
  defaultIdcc: string;
  defaultName: string;
  defaultNaf?: string;
}) {
  const options = useMemo(() => mergeAgreements(agreements), [agreements]);
  const [idcc, setIdcc] = useState(defaultIdcc);
  const [name, setName] = useState(defaultName);
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<Array<{ idcc: string; name: string }> | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  function suggest() {
    const field = document.querySelector<HTMLInputElement>("#payrollNafCode");
    startTransition(async () => {
      const result = await suggestNafConventions(field?.value ?? defaultNaf);
      setSuggestionError(result.error ?? null);
      setSuggestions(result.candidates ?? null);
    });
  }

  function applyAgreement(agreement: Agreement) {
    setIdcc(agreement.idcc);
    setName(agreement.name);
  }

  function handleIdccChange(value: string) {
    const normalized = value.replace(/\D/g, "").slice(0, 4);
    setIdcc(normalized);
    const match = options.find((agreement) => agreement.idcc === normalized);
    if (match) setName(match.name);
  }

  function handleNameChange(value: string) {
    setName(value);
    const normalized = value.trim().toLocaleLowerCase("fr");
    const match = options.find(
      (agreement) =>
        agreement.name.toLocaleLowerCase("fr") === normalized ||
        (normalized === "syntec" && agreement.idcc === "1486"),
    );
    if (match) setIdcc(match.idcc);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-surface-border p-4">
        <button type="button" disabled={pending} onClick={suggest} className="font-semibold text-brand-primary-dark hover:underline disabled:opacity-50">{pending ? "Recherche…" : "Proposer des conventions à partir du code APE"}</button>
        <p className="mt-2 text-xs leading-5 text-ink-soft">Candidats observés dans un échantillon d’entreprises du même code APE, via le registre officiel. Le code APE est un indice : vérifiez l’activité réelle et le champ de la convention avant de confirmer. Aucun choix n’est enregistré automatiquement.</p>
        {suggestionError && <p role="alert" className="mt-2 text-sm text-accent-rose">{suggestionError}</p>}
        {suggestions && <div className="mt-3 space-y-2">{suggestions.length === 0 ? <p className="text-sm text-ink-soft">Aucune convention retrouvée dans cet échantillon.</p> : suggestions.map(candidate => {
          const known = options.find(option => option.idcc === candidate.idcc);
          return <button key={candidate.idcc} type="button" onClick={() => applyAgreement({ id: `ccn-${candidate.idcc}`, ...candidate, name: known?.name ?? candidate.name })} className="block text-left text-sm text-ink hover:underline">{candidate.idcc} : {known?.name ?? candidate.name}</button>;
        })}<a href="https://code.travail.gouv.fr/outils/convention-collective" target="_blank" rel="noopener noreferrer" className="block text-sm text-brand-primary-dark underline">Vérifier sur le Code du travail numérique</a></div>}
      </div>
      <div>
        <Label htmlFor="collectiveAgreementSelect">Choisir une convention</Label>
        <select
          id="collectiveAgreementSelect"
          value={idcc}
          onChange={(event) => {
            const match = options.find((agreement) => agreement.idcc === event.target.value);
            if (match) applyAgreement(match);
            else setIdcc("");
          }}
          className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="">Sélectionner une convention…</option>
          {options.map((agreement) => (
            <option key={agreement.idcc} value={agreement.idcc}>
              {agreement.idcc} : {agreement.name}
            </option>
          ))}
        </select>
        <FieldHint>Sélectionnez la convention pour renseigner automatiquement son IDCC et son intitulé.</FieldHint>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="collectiveAgreementIdcc">IDCC</Label>
          <Input
            id="collectiveAgreementIdcc"
            name="collectiveAgreementIdcc"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            value={idcc}
            onChange={(event) => handleIdccChange(event.target.value)}
            placeholder="Ex. 1486"
          />
          <FieldHint>4 chiffres. Un IDCC connu renseigne automatiquement le nom de la convention.</FieldHint>
        </div>
        <div>
          <Label htmlFor="collectiveAgreementName">Nom de la convention</Label>
          <Input
            id="collectiveAgreementName"
            name="collectiveAgreementName"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Ex. Syntec"
          />
          <FieldHint>Vous pouvez aussi saisir « Syntec » : RH Pilot associe automatiquement l'IDCC 1486.</FieldHint>
        </div>
      </div>
    </div>
  );
}
