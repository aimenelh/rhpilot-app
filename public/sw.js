js

// Service worker volontairement minimal : sert uniquement à satisfaire
// les critères d'installabilité de Chrome/Android (qui exigent un
// service worker actif avec un gestionnaire "fetch"). Ne met rien en
// cache, ne fonctionne pas hors-ligne — chaque requête part
// normalement vers le réseau. C'est un choix délibéré : une app dont
// les données changent tous les jours (échéances, tâches) ne doit
// jamais risquer de servir du contenu périmé depuis un cache.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Volontairement vide — laisse chaque requête suivre son chemin normal.
});