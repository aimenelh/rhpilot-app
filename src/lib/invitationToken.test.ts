import { describe, expect, it } from "vitest";
import { hashInvitationToken, invitationTokenWhere, newInvitationToken } from "./invitationToken";

describe("jetons d'invitation d'équipe", () => {
  it("stocke une empreinte, jamais le jeton", () => {
    const { token, stored } = newInvitationToken();
    expect(stored).toBe(hashInvitationToken(token));
    expect(stored).not.toContain(token);
  });

  it("retrouve une invitation par l'empreinte du jeton reçu", () => {
    expect(invitationTokenWhere("abc")).toEqual({ OR: [{ token: hashInvitationToken("abc") }, { token: "abc" }] });
  });

  it("refuse une empreinte présentée comme jeton (fuite de base)", () => {
    const stored = hashInvitationToken("secret");
    expect(invitationTokenWhere(stored)).toEqual({ token: hashInvitationToken(stored) });
  });
});
