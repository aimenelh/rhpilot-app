"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, ListChecks, Loader2 } from "lucide-react";
import { Mascot } from "@/components/Mascot";

type SearchResults = {
  employees: { id: string; label: string; meta: string }[];
  tasks: { id: string; label: string; meta: string; employeeEventId: string }[];
};

const DEBOUNCE_MS = 250;

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          setResults(await res.json());
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  // Ferme le panneau au clic à l'extérieur, ou à Échap — comportement
  // attendu de tout champ de recherche, jamais laissé ouvert malgré lui.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function goTo(href: string) {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  const hasResults = results && (results.employees.length > 0 || results.tasks.length > 0);
  const showEmptyState = results && !hasResults && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher un salarié, une tâche..."
          className="w-full rounded-lg border border-surface-border bg-surface-subtle py-2 pl-9 pr-8 text-sm text-ink placeholder:text-ink-faint focus-visible:border-brand-blue focus-visible:bg-white focus-visible:outline-none"
        />
        {isLoading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-faint" />
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-96 overflow-y-auto rounded-lg border border-surface-border bg-white py-1.5 shadow-card">
          {showEmptyState && (
            <div className="flex flex-col items-center gap-2 px-3.5 py-4 text-center">
              <Mascot pose="search" className="h-16 w-auto" />
              <p className="text-sm text-ink-faint">Aucun résultat pour « {query} ».</p>
            </div>
          )}

          {results && results.employees.length > 0 && (
            <div className="px-1.5 pb-1">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Salariés
              </p>
              {results.employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => goTo(`/dashboard/employees/${employee.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-subtle"
                >
                  <User size={14} className="shrink-0 text-ink-faint" />
                  <span className="flex-1 truncate">
                    <span className="font-medium text-ink">{employee.label}</span>
                    <span className="ml-1.5 text-xs text-ink-faint">{employee.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {results && results.tasks.length > 0 && (
            <div className="px-1.5 pb-1">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Tâches
              </p>
              {results.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => goTo(`/dashboard/events/${task.employeeEventId}#task-${task.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-subtle"
                >
                  <ListChecks size={14} className="shrink-0 text-ink-faint" />
                  <span className="flex-1 truncate">
                    <span className="font-medium text-ink">{task.label}</span>
                    <span className="ml-1.5 text-xs text-ink-faint">{task.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
