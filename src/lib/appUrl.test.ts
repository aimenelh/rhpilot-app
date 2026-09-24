import { describe, expect, it } from "vitest";
import { resolveAppUrl } from "@/lib/appUrl";

describe("resolveAppUrl", () => {
  it("préfère APP_URL et retire le slash final", () => {
    expect(
      resolveAppUrl({
        APP_URL: "https://exemple.fr/",
        NEXT_PUBLIC_APP_URL: "https://autre.fr",
        VERCEL_ENV: "production",
      })
    ).toBe("https://exemple.fr");
  });

  it("utilise NEXT_PUBLIC_APP_URL si APP_URL est absent", () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: "https://rhpilot.fr/" })).toBe(
      "https://rhpilot.fr"
    );
  });

  it("retombe sur le domaine canonique en production", () => {
    expect(resolveAppUrl({ VERCEL_ENV: "production" })).toBe("https://rhpilot.fr");
  });

  it("utilise l'URL Vercel en preview", () => {
    expect(
      resolveAppUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "rhpilot-preview.vercel.app",
      })
    ).toBe("https://rhpilot-preview.vercel.app");
  });

  it("reste local hors Vercel", () => {
    expect(resolveAppUrl({})).toBe("http://localhost:3000");
  });
});
