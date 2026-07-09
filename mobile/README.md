# Karamoo Sêebaly — App mobile (Flutter)

Application Android / iOS pour la plateforme NKO (SILYCORE).

## Prérequis

- Flutter SDK 3.12+
- Android Studio (Android) ou Xcode 15+ (iOS, **macOS uniquement**)
- API backend : `https://silycor.xyz` (voir `lib/config/app_settings.dart`)

## Installation

```bash
flutter pub get
dart run flutter_launcher_icons
```

## Build Android

```bash
flutter build apk --release
# Sortie : build/app/outputs/flutter-apk/app-release.apk
```

Déployer sur le VPS :
```bash
scp build/app/outputs/flutter-apk/app-release.apk user@vps:/var/www/NKO/public/apk/nkosebaly-latest.apk
```

## Build iOS (sur Mac)

1. Ouvrir `ios/Runner.xcworkspace` dans Xcode
2. Signing & Capabilities → sélectionner votre **Team** Apple Developer
3. Bundle ID : `com.silycore.nkosebaly` (à ajuster dans Xcode si besoin)
4. Terminal :

```bash
flutter build ios --release
# ou archive via Xcode : Product → Archive → Distribute App (TestFlight)
```

### Permissions iOS configurées

- **Caméra** — scan carte PVC + QR web
- **HTTPS** — connexion à `silycor.xyz` uniquement

### Identifiant appareil iOS

Sur iOS, l’ID appareil est un **UUID persistant** (Keychain), distinct d’Android.

## Fonctionnalités

- Activation licence PVC (QR)
- Cours, leçons, quiz, offline vidéo chiffré
- Certificats + paiement Djomy (navigateur)
- Profil éditable
- Connexion web par QR

## Version

`1.0.0+1` — voir `pubspec.yaml`
