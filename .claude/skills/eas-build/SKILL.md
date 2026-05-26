---
name: eas-build
description: EAS Build, Submit, Update (OTA) — pipeline release dla aplikacji Expo SDK 54. Konfiguracja eas.json (profiles development/preview/production), credentials management, submit do App Store i Play Store, OTA updates, code signing. Używaj przy konfiguracji deploymentu, build problemach, release management, OTA update flow.
---

# EAS Build & Submit & Update

Pipeline release dla aplikacji **Expo SDK 54** w projekcie sleeper.

> ⚠️ **SDK 54 lock**: NIE podnosić bez explicit user approval (downgrade z 56 dla Expo Go App Store compatibility — patrz `docs/commits/2026-05-26-12bffeb-sdk54-downgrade.md`).

## Kiedy używać

- Konfiguracja `eas.json` profiles (development / preview / production)
- Setup credentials (Apple Developer, Google Play Console)
- Build dla TestFlight / Internal Testing
- Submit do App Store / Play Store
- OTA updates przez EAS Update
- Debug błędów build (native crashes, dependency conflicts)

## Status w sleeper

Faza 7 (post-MVP / release prep) — **nie skonfigurowane** w MVP. Ten skill aktywuje się gdy:
- Trzeba zrobić first build (Faza 7)
- Pojawi się crash w EAS build
- Pora na TestFlight / internal release

## eas.json profile dla sleeper

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://dev.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "dev-anon-key"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://staging.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "staging-anon-key"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://prod.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "prod-anon-key"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "1234567890",
        "appleTeamId": "ABC123XYZ"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

## Profile decisions

| Profile | Distribution | Native rebuild | Use case |
|---------|--------------|----------------|----------|
| `development` | internal (ad-hoc) | Per native change | Dev z native modules (Sentry, biometric) |
| `preview` | internal (ad-hoc, link) | Per native change | Testowanie pre-release z rodziną/testerami |
| `production` | App Store / Play Store | Per native change | Final release |

**OTA via EAS Update** — JS-only zmiany; bez nowego buildu. Channel = profile name.

## Branch policy

```
feature/*  → development build (jeśli wymaga native)
develop    → preview build (auto-build w CI co commit)
main       → preview build + EAS Update channel "preview"
release/*  → production build → submit → App Store + Play Store
```

W sleeper MVP (solo dev, branch `feature/mvp-sleep-tracker`):
- Większość pracy: Expo Go (no native build needed)
- Pierwszy native build: Faza 7 (Sentry native crash setup + biometric jeśli dochodzi)
- Sample preview build dla rodziny: po Fazie 5 (działający MVP z notyfikacjami)

## Credentials

### iOS (Apple Developer)

Wymagane:
1. Apple Developer Account ($99/rok)
2. App ID w developer.apple.com (np. `com.sleeper.mobile`)
3. Distribution certificate
4. Provisioning profile (ad-hoc dla preview, App Store dla production)

EAS może zarządzać tym automatycznie:
```bash
eas credentials  # interaktywny wizard
```

### Android (Google Play Console)

Wymagane:
1. Google Play Console account ($25 one-time)
2. App w Play Console (`com.sleeper.mobile`)
3. Service Account JSON key (`google-play-key.json` — NIE COMMITUJ; w `.gitignore`)
4. Keystore (EAS może wygenerować i przechowywać)

```bash
eas credentials --platform android
```

## Build commands

```bash
# Dev build (jednorazowy, gdy zmieniasz native config)
eas build --profile development --platform all

# Preview build (do testowania)
eas build --profile preview --platform all

# Production build (przed submit)
eas build --profile production --platform all

# Konkretna platforma
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Local build (debug, bez EAS — wymaga Xcode/Android Studio)
eas build --local --profile preview --platform ios
```

Build czeka 5-15 min na EAS infrastructure (free tier: 30 builds/month w Personal). Build status: `eas build:list`.

## EAS Update (OTA)

JS-only updates bez App Store submit:

```bash
# Setup (jednorazowy)
eas update:configure

# Push update do channelu
eas update --channel preview --message "Fix: timer rounding bug"
eas update --channel production --message "v1.2.0 features"
```

W app:
```typescript
import * as Updates from 'expo-updates';

// Sprawdź czy jest update
const update = await Updates.checkForUpdateAsync();
if (update.isAvailable) {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync(); // restart app z nowym JS
}
```

**Co MOŻNA przez OTA:**
- JS bug fixes
- UI changes (NativeWind, komponenty)
- Logic fixes (hooks, helpers)
- Translation updates

**Co NIE przez OTA (wymaga nowego buildu):**
- Native modules (nowy package z native code)
- Permissions w `app.config.ts`
- `app.json` plugins
- Expo SDK upgrade
- Sentry config changes (czasem)

## Submit do App Store / Play Store

```bash
# Po production build
eas submit --profile production --platform ios
eas submit --profile production --platform android

# Submit konkretny build by ID
eas submit --platform ios --id <build-id>
```

App Store review: 1-7 dni (zwykle 2-3 dni). Play Store: zazwyczaj w godzinach (Internal Track) lub 1-3 dni (Production Track).

## Code signing & secrets

### Secrets w EAS

```bash
# Set secret (np. Sentry auth token)
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value ...
eas secret:list
```

Secrets dostępne w build env (NIE w `EXPO_PUBLIC_*` które są publiczne).

### Sentry plugin

`app.config.ts` → `plugins: [['@sentry/react-native/expo', {...}]]` automatycznie uploaduje sourcemaps przy każdym build.

## Częste problemy

### "Build failed: <native error>"

1. Sprawdź `eas build:view <id>` → log → szukaj `error:` near end
2. Najczęstsze:
   - **iOS pod install failure** — zła wersja `Podfile.lock`; usuń `ios/Podfile.lock` z repo i rebuild
   - **Android Gradle out of memory** — `--resource-class large` w `eas.json` build profile
   - **Module not found** — `npx expo install --fix` lokalnie, commit, rebuild
3. Sprawdź [Expo discord](https://chat.expo.dev/) i [GitHub Issues](https://github.com/expo/expo/issues)

### "Submit failed: <App Store error>"

- `Invalid Provisioning Profile` — odśwież credentials: `eas credentials --platform ios --clear-cache`
- `Asset Catalog missing icon` — sprawdź `app.config.ts` `ios.icon` (1024x1024, no alpha)
- Apple rejection (review): czytaj feedback w App Store Connect, fix, resubmit

### OTA Update nie schodzi do urządzenia

- Sprawdź channel: `eas update:list --channel preview`
- W app: `Updates.checkForUpdateAsync()` — czy zwraca `isAvailable: true`?
- `runtimeVersion` w `app.config.ts` musi się zgadzać (production build z 1.0.0 nie dostanie update z runtimeVersion 1.1.0)

## SDK upgrade policy

**Sleeper SDK 54 LOCK** — NIE podnosić bez user approval. Reason: Expo Go App Store kompatybilność (SDK 55+ wymagało dev client, co complikowało testing).

Jeśli SDK upgrade jest NIEZBĘDNY (np. security fix):
1. Stwórz osobny branch `chore/sdk-upgrade-NN`
2. `npx expo install --fix` (auto-fix dependencies)
3. Manual review breaking changes (https://docs.expo.dev/versions/v55/migrating-to-v55/)
4. Full QA pass (manual + Maestro)
5. EAS build preview → 1 tydzień testów rodziny
6. Dopiero production

## Powiązane skille

- `expo-rn-testing` — pre-release manual + Maestro
- `sentry-integration` — sourcemap upload przez EAS plugin
- `supabase-dev-guidelines` — env vars (EXPO_PUBLIC_SUPABASE_URL per profile)
