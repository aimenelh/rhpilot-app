"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { createInvitation, type InviteFormState } from "./inviteActions";

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

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
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
        <Label htmlFor="invite-role">Rôle</Label>
        <Select id="invite-role" name="accessRole" defaultValue="MEMBER">
          <option value="MEMBER">Membre</option>
          <option value="ADMIN">Administrateur</option>
        </Select>
      </div>
      <SubmitButton />
      {state && "error" in state && (
        <p role="alert" className="w-full text-sm text-accent-rose sm:basis-full">
          {state.error}
        </p>
      )}
      {state && "success" in state && (
        <p className="w-full text-sm text-accent-teal sm:basis-full">{state.success}</p>
      )}
    </form>
  );
}
