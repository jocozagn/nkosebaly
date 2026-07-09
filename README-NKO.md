# Karamoo Sêebaly / NKO — Guide déploiement

Plateforme e-LMS **Next.js 15** (web + admin) + app **Flutter Android** (`nkosebaly`).

## URLs production

| Service | URL |
|---------|-----|
| Site web | https://silycor.xyz |
| Admin | https://silycor.xyz/admin |
| Téléchargement APK | https://silycor.xyz/get-app |
| Webhook Djomy | https://silycor.xyz/api/webhooks/djomy |
| Health | https://silycor.xyz/api/health |

## Prérequis VPS

- Node.js 20+
- PM2
- Nginx (reverse proxy port 3001)
- Certbot (HTTPS)

## Déploiement web (VPS)

```bash
cd /var/www/NKO
git pull   # ou pscp des fichiers modifiés
npm install
export NODE_OPTIONS='--max-old-space-size=4096'
npm run build
pm2 restart nko
```

## APK mobile

1. Build release Flutter :
   ```bash
   cd nkosebaly
   flutter pub get
   flutter build apk --release
   ```
2. Copier sur le serveur :
   ```bash
   scp build/app/outputs/flutter-apk/app-release.apk root@VPS:/var/www/NKO/public/apk/nkosebaly-latest.apk
   ```
3. Vérifier : https://silycor.xyz/get-app

## Backup quotidien

Script : `scripts/vps-backup.sh`

Cron recommandé (3h du matin) :
```bash
0 3 * * * /var/www/NKO/scripts/vps-backup.sh >> /var/log/nko-backup.log 2>&1
```

Sauvegarde : `/var/backups/nko/` (rétention 14 jours).

## Djomy (paiement certificat)

Variables `.env` requises :
- `DJOMY_CLIENT_ID`
- `DJOMY_CLIENT_SECRET`
- `DJOMY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_WEB_URL=https://silycor.xyz`

Enregistrer le webhook chez Djomy : `POST https://silycor.xyz/api/webhooks/djomy`

## Parcours utilisateur

1. **Activation** — Scan QR carte PVC (web ou app)
2. **Profil** — Nom + téléphone obligatoires
3. **Cours** — Progression séquentielle, quiz par leçon
4. **Certificat** — Paiement Djomy (web + mobile)
5. **Connexion web** — QR depuis l'app mobile

## Structure du dépôt

| Dossier | Projet |
|---------|--------|
| `/` | Web + admin Next.js |
| `/mobile` | App Flutter Android / iOS (copie monorepo) |

**Repo mobile dédié** : [github.com/jocozagn/-nkosebaly-app](https://github.com/jocozagn/-nkosebaly-app)

## Package manager

Utiliser **bun** ou **npm** selon l'environnement local.

## Tests & CI

```bash
npm run test          # tests unitaires Vitest
npm run audit:nko     # vérifie les routes API NKO
npm run build         # build production
```

Pipeline GitHub Actions : `.github/workflows/ci.yml` (tests + build + audit routes).

Variables Djomy requises uniquement en prod — les tests unitaires mockent la config localement.

## Code legacy

Voir `docs/LEGACY-CODE.md` pour les dossiers marketplace non utilisés par NKO.

## Support

SILYCORE — voir `src/constants/brand.ts`
