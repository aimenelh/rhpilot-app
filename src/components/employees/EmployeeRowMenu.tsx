"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, FileText, MoreHorizontal, Pencil, Route, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Menu « ⋯ » d'une ligne de la liste des salariés : les actions courantes
// sans avoir à ouvrir la fiche puis chercher le bon onglet.
export function EmployeeRowMenu({
  employeeId,
  employeeName,
  archiveAction,
}: {
  employeeId: string;
  employeeName: string;
  archiveAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target as Node | null;
      if (target && (menuRef.current?.contains(target) || buttonRef.current?.contains(target))) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function toggle() {
    const rect = buttonRef.current?.getBoundingClientRect();
    // Position fixe : le menu n'est pas coupé par le tableau qui défile horizontalement.
    if (rect) setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setOpen((value) => !value);
  }

  const base = `/dashboard/employees/${employeeId}`;
  const itemClass =
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface-subtle focus:bg-surface-subtle focus:outline-none";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions pour ${employeeName}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && position && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: position.top, right: position.right }}
          className="fixed z-50 w-56 rounded-xl border border-surface-border bg-white p-1.5 shadow-elevated"
        >
          <Link role="menuitem" href={base} className={itemClass} onClick={() => setOpen(false)}>
            <FileText size={15} className="text-ink-faint" /> Ouvrir la fiche
          </Link>
          <Link role="menuitem" href={`${base}?onglet=informations`} className={itemClass} onClick={() => setOpen(false)}>
            <Pencil size={15} className="text-ink-faint" /> Modifier les informations
          </Link>
          <Link role="menuitem" href={`${base}#lancer-parcours`} className={itemClass} onClick={() => setOpen(false)}>
            <Route size={15} className="text-ink-faint" /> Lancer un parcours
          </Link>
          <Link role="menuitem" href={`${base}?onglet=paie`} className={itemClass} onClick={() => setOpen(false)}>
            <Wallet size={15} className="text-ink-faint" /> Paie
          </Link>
          <div className="my-1.5 border-t border-surface-border" />
          <button
            role="menuitem"
            type="button"
            className={`${itemClass} text-accent-rose`}
            onClick={() => {
              setOpen(false);
              dialogRef.current?.showModal();
            }}
          >
            <Archive size={15} /> Archiver
          </button>
        </div>
      )}

      <form ref={formRef} action={archiveAction} className="hidden" />
      <dialog ref={dialogRef} className="rounded-xl border border-surface-border p-0 text-left shadow-elevated backdrop:bg-ink/40">
        <div className="w-80 p-5">
          <h2 className="text-sm font-semibold text-ink">Archiver {employeeName} ?</h2>
          <p className="mt-2 text-sm font-normal normal-case tracking-normal text-ink-soft">
            Le salarié disparaît des listes actives et ses tâches ne sont plus suivies. Rien n&apos;est supprimé : vous
            pourrez le réactiver depuis l&apos;onglet Archivés. S&apos;il a activé son espace salarié, il garde l&apos;accès à
            ses bulletins et documents.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                dialogRef.current?.close();
                formRef.current?.requestSubmit();
              }}
            >
              Archiver
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
