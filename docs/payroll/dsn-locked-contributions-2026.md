# Raccordement des cotisations aux bulletins verrouillés

Le pré-contrôle des périodes réelles utilise maintenant le générateur de cotisations. Le mapping P26V01-RG-2026.1 reprend exclusivement les lignes, bases et totaux du bulletin détaillé et ses entrées gelées. Il rapproche, au centime, les dettes Urssaf et retraite et les charges différées avec les cotisations salariales et patronales.

## Traductions couvertes
- Maladie 075 et complément 907 / CTP 635, famille 074 et complément 102 / CTP 430, AT, vieillesse plafonnée et déplafonnée, CSA, FNAL, chômage, AGS, dialogue social, CFP, part principale de taxe d'apprentissage et CPF-CDD.
- CSG/CRDS des rémunérations ordinaires : conservation du total verrouillé et ventilation documentée de la ligne combinée.
- Retraite unifiée 131 répartie entre bases 02 et 03, APEC 132, données de contrôle 142 et 146. Ces dernières ne créent aucune dette Urssaf supplémentaire. Le bloc 81 ne porte pas d'identifiant OPS pour 131/132/106.
- RGDU répartie entre Urssaf et retraite sur les cumuls puis différenciée au mois ; récupération du bulletin antérieur si le cumul est non nul. Réduction via 668, reversement via 669. Les changements de seuil FNAL en cours d'année et reprises globales sans détail sont bloqués.
- SMIC de la période repris par différence des cumuls du moteur, sans substitution du SMIC courant. Le solde de taxe d'apprentissage est conservé comme charge différée, sans être payé chaque mois.
- Paiements SEPA Urssaf, retraite et DGFiP à partir des montants dus, coordonnées françaises validées et IBAN chiffré. Les dates et SIRET payeur non exploités ne sont pas ajoutés.
- Les heures payées et l'assiette chômage effectivement plafonnée remplacent la quotité et le brut implicites.

Les identifiants des organismes viennent des notifications d'affiliation ; le code groupe retraite n'est pas un identifiant de paiement. La confirmation des mandats n'enregistre pas de mandat auprès d'un organisme. Aucun fichier de test ne déclenche un prélèvement.

## Limites bloquantes avant ouverture

Ce raccordement n'est pas l'achèvement de la DSN. Les affiliations santé/prévoyance FPOC, la mobilité et le forfait social non nuls, les apprentis, Alsace-Moselle, heures supplémentaires, primes, absences, fins de contrat, contributions annuelles d'avril, régularisations rattachées à des mois antérieurs et crédits organisme restent bloqués. Les régularisations de tranches/CET qui ne peuvent pas être rattachées au mois sont également exclues.

Restent le dossier immuable de déclaration et son historique, le suivi des retours métier, les signalements événementiels, la recette de dépôt sur plateforme éditeurs et une validation financière indépendante. Le mode réel est désactivé. Les paramètres 2026 ne sont pas prolongés en 2027.

## Preuves

Les tests construisent de vrais résultats du moteur pour différents salaires, temps partiel, passages de tranche et reversement RGDU. Le contrôle officiel ajoute trois fichiers issus de ces résultats aux trois fixtures de structure historiques ; les exemples restent synthétiques et ne constituent pas une recette d'une entreprise réelle.

Sources :
- https://www.urssaf.fr/accueil/actualites/declaration-cotisation-am-af.html
- https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale-cotisation.html
- https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2556/
- https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/2537/
- https://www.net-entreprises.fr/media/documentation/dsn-cahier-technique-2026.1.pdf
- https://www.audiens.org/files/live/sites/siteAudiens/files/03_documents/entreprise/DSN/FP-Parametrage-DSN.pdf
