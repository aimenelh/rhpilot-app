import { describe, expect, it } from "vitest";
import { normalizeNaf, observedNafConventions } from "./nafConventions";
describe("official NAF suggestions", () => {
 it("normalizes formats and rejects unsupported values", () => {expect(normalizeNaf("6202a")).toBe("62.02A");expect(normalizeNaf("62.02A")).toBe("62.02A");expect(normalizeNaf("<script>")).toBeNull();});
 it("keeps candidates observed in the requested sector, excluding technical codes and duplicates", () => {const data={results:[{activite_principale:"62.02A",complements:{liste_idcc:["1486","1486","9999","0"]}},{activite_principale:"62.02A",complements:{liste_idcc:["1486","573"]}},{activite_principale:"10.71C",complements:{liste_idcc:["843"]}}]};expect(observedNafConventions(data,"6202A")).toEqual(["1486","0573"]);});
 it("handles missing or malformed registry data", () => {expect(observedNafConventions(null,"6202A")).toEqual([]);expect(observedNafConventions({results:[null,{}, {activite_principale:"62.02A",complements:{liste_idcc:"1486"}}]},"6202A")).toEqual([]);});
});
