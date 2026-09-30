# Congés payés et calendrier d'entreprise

Le moteur `rhpilot-bulletin-2026.4` distingue le planning contractuel du salarié et les cinq jours utilisés par l'entreprise pour décompter les 25 jours ouvrés. Le temps partiel conserve les mêmes droits annuels : une semaine de congé sur une répartition de trois jours ne consomme pas seulement trois jours ouvrés.

Le calendrier d'entreprise est obligatoire quand l'organisation choisit le décompte en 25 jours ouvrés. La migration ajoute une valeur nullable, sans supposer lundi-vendredi pour les organisations existantes. Les paramètres de paie permettent de choisir les cinq jours. Le mode 30 jours ouvrables continue à compter du premier jour normalement travaillé à la veille de la reprise, hors dimanches et jours fériés.

L'intervalle de congé est déterminé avant sa répartition entre les mois. Le samedi suivant un vendredi situé en fin de mois reste compté dans le mois suivant. Le chargement de la paie retrouve les congés précédents nécessaires à ce report pour les salariés encore actifs. Les congés sans chevauchement ni report ne produisent pas de montant.

Le maintien et le dixième sont comparés en cumul sur une même absence ; ce qui a déjà été payé est soustrait. Cette comparaison évite de choisir séparément la meilleure méthode dans chaque mois et de surpayer le congé. Un historique d'indemnité absent ou un changement de période de référence exige une vérification plutôt qu'un résultat implicite. Le changement de planning entre deux mois de paie reste à traiter dans le moteur ; le portail peut déjà utiliser le planning applicable à la date de reprise.

Un changement de durée, de planning ou d'heures supplémentaires structurelles en milieu de mois bloque maintenant le calcul : l'horaire du dernier profil ne s'applique plus silencieusement au mois entier. Un changement au premier jour du mois reste accepté. Le traitement segmenté de deux horaires dans un même bulletin reste à implémenter.

L'espace salarié compare les dates d'effet comme des dates civiles et tient compte du planning à la reprise ainsi que des jours fériés d'Alsace-Moselle. Un calendrier ou un planning inconnu reste « à confirmer ». Le total des demandes à venir n'est plus tronqué aux vingt premières demandes.

Validation ciblée : huit nouveaux cas de calendrier et d'indemnité, plus les tests existants du moteur et de son intégration. La CI vérifie la migration, le schéma, les types, les tests PostgreSQL et le build. Ces changements ne recalculent pas les bulletins déjà verrouillés.

Références : https://www.service-public.gouv.fr/particuliers/vosdroits/F33927 et https://www.service-public.gouv.fr/particuliers/vosdroits/F682 ; C. trav. art. L3141-24 pour la comparaison du maintien et du dixième.
