type NameableUser = {
  firstName: string | null;
  lastName: string | null;
  email: string;
};

/**
 * Nom complet si disponible (reçu depuis Clerk), sinon repli sur
 * l'email. Certaines méthodes d'inscription (ex. email seul, sans
 * Google) peuvent ne jamais fournir de prénom/nom.
 */
export function getUserDisplayName(user: NameableUser): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.email;
}
