"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { checkSiret } from "@/lib/siret";

type SiretResult = {
  name: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  apeCode: string | null;
  legalCategory: string | null;
  conventions: Array<{ idcc: string; title: string | null }>;
  active: boolean;
};

export function CreateOrganizationForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [siret, setSiret] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<SiretResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoinSubmit(event: React.FormEvent) {
    event.preventDefault();
    setJoinError(null);
    setIsJoining(true);

    try {
      const response = await fetch("/api/join-with-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Une erreur est survenue");
      }

      router.refresh();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsJoining(false);
    }
  }

  // Dès que les 14 chiffres sont saisis et valides, l'entreprise est
  // recherchée d'elle-même dans la base publique pour pré-remplir le nom.
  const lastLookup = useRef("");
  useEffect(() => {
    if (siret.length !== 14 || !checkSiret(siret).ok || lastLookup.current === siret) return;
    lastLookup.current = siret;
    void handleSiretLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siret]);

  const siretStatus = siret.length === 14 ? checkSiret(siret) : null;

  async function handleSiretLookup() {
    setError(null);
    setLookupResult(null);
    setIsLookingUp(true);

    try {
      const response = await fetch(`/api/siret-lookup?siret=${encodeURIComponent(siret)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Recherche impossible.");
      }

      setLookupResult(data);
      if (data.name) setName(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recherche impossible.");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const check = checkSiret(siret);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, siret }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Une erreur est survenue");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="flex gap-1 rounded-lg bg-surface-subtle p-1">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === "create" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          Créer une organisation
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            mode === "join" ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
          }`}
        >
          Rejoindre une organisation
        </button>
      </div>

      {mode === "join" ? (
        <>
          <h1 className="mt-6 text-lg font-semibold text-ink">Rejoindre avec une invitation</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Si quelqu&apos;un vous a invité·e à rejoindre son organisation, collez ici le lien
            complet reçu par email.
          </p>

          <form onSubmit={handleJoinSubmit} className="mt-6 flex flex-col gap-5">
            <div>
              <Label htmlFor="join-code">Lien d&apos;invitation</Label>
              <Input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="https://rhpilot.fr/join/..."
                required
                disabled={isJoining}
              />
              <FieldHint>
                Collez le lien tel qu&apos;il apparaît dans l&apos;e-mail reçu. L&apos;invitation
                doit avoir été envoyée à la même adresse e-mail que celle utilisée pour vous
                connecter ici.
              </FieldHint>
            </div>

            {joinError && (
              <p role="alert" className="text-sm text-accent-rose">
                {joinError}
              </p>
            )}

            <Button type="submit" disabled={isJoining} className="w-full">
              {isJoining ? "Vérification..." : "Rejoindre l'organisation"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-lg font-semibold text-ink">Créez votre espace RH Pilot</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Saisissez le SIRET de votre entreprise. Son nom est repris du répertoire Sirene. RH Pilot est gratuit jusqu&apos;à 3 salariés.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div>
              <Label htmlFor="org-siret">SIRET de l&apos;entreprise</Label>
              <div className="flex gap-2">
                <Input
                  id="org-siret"
                  type="text"
                  inputMode="numeric"
                  value={siret}
                  onChange={(event) => setSiret(event.target.value.replace(/\D/g, "").slice(0, 14))}
                  placeholder="14 chiffres"
                  required
                  aria-invalid={siretStatus ? !siretStatus.ok : undefined}
                  autoComplete="off"
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSiretLookup}
                  disabled={isLookingUp || siret.length !== 14}
                  className="shrink-0"
                >
                  <Search size={14} />
                  {isLookingUp ? "..." : "Rechercher"}
                </Button>
              </div>
              <FieldHint>
                {siretStatus && !siretStatus.ok
                  ? siretStatus.error
                  : "Il figure sur votre Kbis, votre avis de situation Insee ou un bulletin de paie. Pour découvrir RH Pilot sans entreprise, les tutoriels et les données de démonstration suffisent."}
              </FieldHint>
              {lookupResult && (
                <div className="mt-2 rounded-lg bg-brand-primary/5 px-3 py-2 text-xs leading-5 text-ink-soft">
                  <p>
                    <strong className="text-ink">{lookupResult.name}</strong>
                    {lookupResult.address && <>, {lookupResult.address}</>}
                    {(lookupResult.postalCode || lookupResult.city) && <>, {[lookupResult.postalCode, lookupResult.city].filter(Boolean).join(" ")}</>}
                  </p>
                  <p>
                    {[lookupResult.legalCategory && lookupResult.legalCategory !== "autre" ? lookupResult.legalCategory : null, lookupResult.apeCode ? `APE ${lookupResult.apeCode}` : null].filter(Boolean).join(" · ")}
                  </p>
                  {lookupResult.conventions.length > 0 ? (
                    <p>
                      Convention collective : {lookupResult.conventions[0].title ? `${lookupResult.conventions[0].title} (IDCC ${lookupResult.conventions[0].idcc})` : `IDCC ${lookupResult.conventions[0].idcc}`}
                      {lookupResult.conventions.length > 1 && <> et {lookupResult.conventions.length - 1} autre{lookupResult.conventions.length > 2 ? "s" : ""}</>}
                    </p>
                  ) : null}
                  {!lookupResult.active && <p className="text-accent-rose">Le répertoire Sirene indique que cet établissement est fermé.</p>}
                  <p className="mt-1 text-ink-faint">
                    Repris du répertoire Sirene de l’Insee. Ces informations servent au paramétrage de la paie, vous n’avez pas à les saisir.
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="org-name">Nom de votre entreprise</Label>
              <Input
                id="org-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Montpellier Centre Ophtalmologie"
                required
                minLength={2}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-accent-rose">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting || !siretStatus?.ok} className="w-full">
              {isSubmitting ? "Création..." : "Créer mon espace RH"}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
