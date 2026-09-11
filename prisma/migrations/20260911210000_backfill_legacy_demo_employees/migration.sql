-- La migration précédente (20260911190000) a ajouté isDemoData avec
-- DEFAULT false, ce qui a marqué rétroactivement comme "réels" les
-- salariés de démonstration créés par une version antérieure du
-- générateur, avant que ce champ existe. Ces salariés étant archivés
-- (deletedAt renseigné), ils sont invisibles dans la liste des
-- salariés actifs mais comptent toujours dans la vérification "cette
-- organisation contient des salariés réels" de generateDemoOrganization,
-- qui bloque alors toute régénération.
--
-- Ne touche que des salariés déjà archivés (deletedAt IS NOT NULL) et
-- correspondant exactement aux 15 noms du jeu de démonstration, pour
-- ne risquer aucune donnée réelle d'un autre compte.

UPDATE "employees"
SET "isDemoData" = true
WHERE "deletedAt" IS NOT NULL
  AND ("firstName", "lastName") IN (
    ('Antoine', 'Perrot'),
    ('Emma', 'Roussel'),
    ('Manon', 'Dubreuil'),
    ('Karim', 'Belhaj'),
    ('Nicolas', 'Fabre'),
    ('Julien', 'Marchand'),
    ('Léa', 'Fontaine'),
    ('Sarah', 'Benali'),
    ('Sophie', 'Lemoine'),
    ('Thomas', 'Girard'),
    ('Hugo', 'Lacroix'),
    ('Chloé', 'Bertin'),
    ('Inès', 'Chevalier'),
    ('Maxime', 'Renard'),
    ('Camille', 'Vidal')
  );
