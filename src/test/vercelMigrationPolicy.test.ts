import { describe, expect, it, vi } from "vitest";
import { retryableDatabaseConnection, runWithConnectionRetry } from "../../scripts/vercel-migration-policy.mjs";

describe("déploiement et indisponibilité PostgreSQL", () => {
  it("réessaie une connexion temporairement indisponible puis retourne le succès", async () => {
    const run = vi.fn().mockReturnValueOnce({ status: 1, output: "Error P1001: Can't reach database server" }).mockReturnValue({ status: 0, output: "Migrations applied" });
    const wait = vi.fn().mockResolvedValue(undefined);
    expect((await runWithConnectionRetry(run, wait, { warn: vi.fn() })).status).toBe(0);
    expect(run).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(2000);
  });
  it("reste en échec après trois connexions refusées", async () => {
    const run = vi.fn().mockReturnValue({ status: 1, output: "P1002 timeout" });
    const wait = vi.fn().mockResolvedValue(undefined);
    expect((await runWithConnectionRetry(run, wait, { warn: vi.fn() })).status).toBe(1);
    expect(run).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[2000], [5000]]);
  });
  it.each(["P1000 authentication failed", "P3009 failed migration", "P3018 P1001 migration failed", "Unknown error"])("ne relance pas l'erreur %s", async (output) => {
    const run = vi.fn().mockReturnValue({ status: 1, output });
    const wait = vi.fn();
    expect(retryableDatabaseConnection(output)).toBe(false);
    expect((await runWithConnectionRetry(run, wait, { warn: vi.fn() })).status).toBe(1);
    expect(run).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });
});
