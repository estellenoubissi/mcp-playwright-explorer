export function buildExploratoryPrompt(url: string, featureName: string): string {
  return `
Tu es un expert QA senior chargé d'analyser exhaustivement une feature d'application web.

## Contexte
- URL cible : ${url}
- Feature / Onglet ciblé : ${featureName}

## PHASE 1 — Exploration & Analyse
1. Navigue vers l'URL fournie
2. Accède à l'onglet/section "${featureName}"
3. Analyse exhaustivement tous les éléments UI, appels réseau, validations et états

## PHASE 2 — Génération de cas de tests
Génère des cas couvrant :
- ✅ CAS PASSANTS : flux nominaux, données valides, limites acceptées
- ❌ CAS NON-PASSANTS : données invalides, champs manquants, erreurs réseau, injections
- 🔴 CAS COMPLEXES : multi-conditions, multi-étapes, rôles, race conditions
- 🟢 CAS SIMPLES : vérifications UI unitaires, labels, affichage conditionnel

## PHASE 3 — Format de sortie obligatoire
Retourne UNIQUEMENT un JSON valide :

{
  "feature": "${featureName}",
  "url": "${url}",
  "testCases": [
    {
      "id": "TC-001",
      "feature": "${featureName}",
      "categorie": "PASSANT",
      "titre": "Titre court et explicite",
      "preconditions": [],
      "etapes": ["Étape 1", "Étape 2"],
      "donnees_test": {},
      "resultat_attendu": "Résultat précis attendu",
      "priorite": "CRITIQUE",
      "automatisable": true,
      "complexite": 1,
      "tags": ["smoke"]
    }
  ]
}
`.trim();
}
