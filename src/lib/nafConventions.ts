// Official registry observations provide candidates, never a legal determination.
export function normalizeNaf(value: unknown): string | null {
 if (typeof value !== "string") return null;
 const compact = value.trim().toUpperCase().replace(".", "");
 return /^\d{4}[A-Z]$/.test(compact) ? `${compact.slice(0,2)}.${compact.slice(2)}` : null;
}
export function observedNafConventions(payload: unknown, naf: string): string[] {
 if (!payload || typeof payload !== "object" || !Array.isArray((payload as { results?: unknown }).results)) return [];
 const count = new Map<string, number>();
 for (const row of (payload as { results: unknown[] }).results) {
  if (!row || typeof row !== "object") continue;
  const company = row as { activite_principale?: string; complements?: { liste_idcc?: unknown[] } };
  if (normalizeNaf(company.activite_principale) !== normalizeNaf(naf)) continue;
  const codes = company.complements?.liste_idcc;
  if (!Array.isArray(codes)) continue;
  for (const value of new Set(codes)) {
   if (typeof value !== "string" || !/^\d{1,4}$/.test(value)) continue;
   const idcc = value.padStart(4, "0");
   if (Number(idcc) === 0 || Number(idcc) >= 9000) continue;
   count.set(idcc, (count.get(idcc) ?? 0) + 1);
  }
 }
 return [...count].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,5).map(([idcc]) => idcc);
}
