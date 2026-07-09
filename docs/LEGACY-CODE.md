# Code legacy e-LMS (marketplace WRTeam)

Ce dépôt contient du code hérité du template **e-LMS marketplace** (instructeurs, panier, Stripe, Firebase, wallet…).  
Le produit actif **Karamoo Sêebaly / NKO** n'utilise **pas** ces modules.

## Dossiers legacy (non routés NKO)

| Dossier | Contenu | Action recommandée |
|---------|---------|-------------------|
| `src/components/instructor/` | Panel instructeur | Ne pas modifier — isolé |
| `src/components/pagesComponent/` | Pages marketplace | Ne pas modifier — isolé |
| `src/components/cart/` | Panier | Idem |
| `src/components/payment/` (Stripe) | Paiements legacy | Idem |
| `src/utils/api/instructor/` | API WRTeam | Idem |
| `src/utils/api/user/` (partiel) | Profil marketplace | Idem |

## Ce qui est actif (NKO)

- `src/components/nko/` — espace élève web
- `src/components/admin/` — administration
- `src/app/api/mobile/` — API Flutter
- `src/app/api/admin/` — API admin
- `src/lib/admin/store.ts` — persistance JSON

## Règle pour les développeurs

1. **Nouvelles features** → uniquement dans les dossiers NKO ci-dessus  
2. **Ne pas importer** depuis `instructor/`, `pagesComponent/cart`, etc.  
3. **Suppression future** : possible quand le repo sera migré sur Git et après audit des imports restants

## Vérification CI

```bash
npm run audit:nko
npm run test
```

Le script `scripts/audit-nko-routes.mjs` garantit que les routes API NKO essentielles existent.
