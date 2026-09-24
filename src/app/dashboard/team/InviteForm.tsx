"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { createInvitation, type InviteFormState } from "./inviteActions";

const ROLE_HELP: Record<"MEMBER" | "ADMIN", string> = {
  MEMBER:
    "Accès standard à l’espace de travail. Ce rôle ne peut pas inviter de nouveaux membres ni utiliser les actions explicitement réservées aux administrateurs.",
  ADMIN:
    "Accès d’administration opérationnelle. Ce rôle peut notamment inviter des membres et utiliser les actions signalées comme réservées aux administrateurs.",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Envoi..." : "Envoyer l'invitation"}
    </Button>
  );
}

export function InviteForm() {
  const [state, formAction] = useFormState<InviteFormState, FormData>(createInvitation, undefined);
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
      <div>
        <Label htmlFor="invite-email">Adresse email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="collegue@entreprise.fr"
        />
      </div>
      <div>
        <Label htmlFor="invite-role">Niveau d’accès</Label>
        <Select
          id="invite-role"
          name="accessRole"
          value={role}
          onChange={(event) => setRole(event.target.value === "ADMIN" ? "ADMIN" : "MEMBER")}
          aria-describedby="invite-role-help"
        >
          <option value="MEMBER">Membre</option>
          <option value="ADMIN">Administrateur</option>
        </Select>
      </div>
      <SubmitButton />

      <p id="invite-role-help" className="text-xs leading-5 text-ink-faint sm:col-span-3">
        <span className="font-semibold text-ink-soft">{role === "ADMIN" ? "Administrateur" : "Membre"} :</span>{" "}
        {ROLE_HELP[role]}
      </p>

      {state && "error" in state && (
        <div role="alert" className="sm:col-span-3">
          <p className="text-sm text-accent-rose">{state.error}</p>
          {state.manualJoinUrl && (
            <div className="mt-2 rounded-lg border border-surface-border bg-surface-subtle px-3 py-2">
              <p className="text-xs font-medium text-ink-soft">
                L&apos;invitation reste valide. Transmettez ce lien manuellement :
              </p>
              <a
                href={state.manualJoinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-xs font-medium text-brand-primary hover:underline"
              >
                {state.manualJoinUrl}
              </a>
            </div>
          )}
        </div>
      )}
      {state && "success" in state && (
        <p className="text-sm text-accent-teal sm:col-span-3">{state.success}</p>
      )}
    </form>
  );
}
