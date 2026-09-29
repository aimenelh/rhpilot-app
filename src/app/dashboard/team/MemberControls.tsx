"use client";
import { useFormState, useFormStatus } from "react-dom";
import { useRef } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { manageMember } from "./memberActions";
function Save() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="rounded-lg border border-surface-border px-3 py-2 text-sm disabled:opacity-50">{pending ? "Enregistrement…" : "Enregistrer"}</button>; }
export function MemberControls({ memberId, accessRole, functionalRole, isOwner }: { memberId: string; accessRole: string; functionalRole: string | null; isOwner: boolean }) {
 const [state, action] = useFormState(manageMember, undefined);
 const removeForm = useRef<HTMLFormElement>(null);
 return <div className="mt-3 space-y-2">
 <form action={action} className="flex flex-wrap items-center gap-2"><input type="hidden" name="memberId" value={memberId}/><input type="hidden" name="operation" value="update"/>
 <select name="accessRole" aria-label="Rôle d’accès" defaultValue={accessRole} className="rounded-lg border border-surface-border p-2 text-sm"><option value="MEMBER">Membre</option>{isOwner && <option value="ADMIN">Administrateur</option>}</select>
 <select name="functionalRole" aria-label="Fonction" defaultValue={functionalRole ?? ""} className="rounded-lg border border-surface-border p-2 text-sm"><option value="">Sans fonction</option><option value="RH">RH</option><option value="DIRIGEANT">Dirigeant</option></select><Save /></form>
 <form ref={removeForm} action={action}><input type="hidden" name="memberId" value={memberId}/><input type="hidden" name="operation" value="remove"/>
 <ConfirmDialog trigger={<button type="button" className="text-sm text-accent-rose hover:underline">Retirer l’accès</button>} title="Retirer ce membre ?" description="Son accès à l’organisation sera retiré. Ses tâches actives et les salariés dont il est manager devront être réattribués. L’historique reste conservé." confirmLabel="Retirer l’accès" onConfirm={() => removeForm.current?.requestSubmit()}/></form>
 {state?.error && <p role="alert" className="text-sm text-accent-rose">{state.error}</p>}{state?.success && <p role="status" className="text-sm text-accent-teal">{state.success}</p>}
 </div>;
}
