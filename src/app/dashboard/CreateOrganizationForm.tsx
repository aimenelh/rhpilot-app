"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

type SiretResult = { name: string; address: string | null; city: string | null; apeCode: string | null };

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
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, siret: siret || null }),
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
                Collez le lien tel qu&apos;il apparaît dans l&apos;email reçu. L&apos;invitation
                doit avoir été envoyée à la même adresse email que celle utilisée pour vous
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
            Vous n&apos;appartenez encore à aucune organisation. Donnez-lui un nom pour commencer.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div>
              <Label htmlFor="org-siret">SIRET (facultatif)</Label>
              <div className="flex gap-2">
                <Input
                  id="org-siret"
                  type="text"
                  inputMode="numeric"
                  value={siret}
                  onChange={(event) => setSiret(event.target.value.replace(/\D/g, "").slice(0, 14))}
                  placeholder="14 chiffres"
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
                Permet de pré-remplir automatiquement le nom de votre entreprise. Totalement
                facultatif, vous pouvez créer votre espace sans, y compris pour un test avec un
                nom fictif.
              </FieldHint>
              {lookupResult && (
                <p className="mt-2 rounded-lg bg-brand-blue/5 px-3 py-2 text-xs text-ink-soft">
                  <strong className="text-ink">{lookupResult.name}</strong>
                  {lookupResult.address && <>, {lookupResult.address}</>}
                  {lookupResult.city && <>, {lookupResult.city}</>}
                  {lookupResult.apeCode && <> · APE {lookupResult.apeCode}</>}
                  <br />
                  <span className="text-ink-faint">
                    Ces informations proviennent de la base publique de l&apos;État.
                  </span>
                </p>
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

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Création..." : "Créer mon organisation"}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
