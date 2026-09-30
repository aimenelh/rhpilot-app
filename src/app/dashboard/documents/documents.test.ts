import React from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ membership: vi.fn(), documents: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: mock.membership }));
vi.mock("@/lib/prisma", () => ({ prisma: { employee_documents: { findMany: mock.documents } } }));
import DocumentsPage from "./page";

describe("accès au répertoire des documents salariés", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Vitest exécute le TSX hors du compilateur React Server Components de Next.
    vi.stubGlobal("React", React);
    mock.documents.mockResolvedValue([]);
  });
  afterAll(() => vi.unstubAllGlobals());
  it("refuse une session absente avant toute lecture de document", async () => {
    mock.membership.mockResolvedValue(null);
    await expect(DocumentsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mock.documents).not.toHaveBeenCalled();
  });
  it("refuse un membre même s’il gère un salarié", async () => {
    mock.membership.mockResolvedValue({ organizationId: "org", accessRole: "MEMBER" });
    await expect(DocumentsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mock.documents).not.toHaveBeenCalled();
  });
  it("limite un administrateur à son organisation sans exposer les clés de stockage", async () => {
    mock.membership.mockResolvedValue({ organizationId: "org", accessRole: "ADMIN" });
    await DocumentsPage();
    const query = mock.documents.mock.calls[0][0];
    expect(query.where).toMatchObject({ organizationId: "org", replacedAt: null, employees: { organizationId: "org", deletedAt: null } });
    expect(query.select).not.toHaveProperty("storageKey");
    expect(query.select).not.toHaveProperty("sha256");
  });
});
