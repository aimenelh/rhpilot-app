import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITEMAP_PATHS } from "./publicPages";

describe("pages du sitemap", () => {
  it("correspondent toutes à une page existante", () => {
    const missing = SITEMAP_PATHS.filter((route) => !existsSync(path.join(process.cwd(), "src/app", route, "page.tsx")));
    expect(missing).toEqual([]);
  });

  it("ne contiennent pas de doublon", () => {
    expect(new Set(SITEMAP_PATHS).size).toBe(SITEMAP_PATHS.length);
  });
});
