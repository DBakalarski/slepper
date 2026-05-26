---
name: security
description: "Systematyczny audyt bezpieczeństwa dla Expo SDK 54 (React Native) + Supabase + Edge Functions. Używaj przy review bezpieczeństwa, przed deployem, przy pracy z auth/authz, walidacją inputów, RLS policies, deep linkami, AsyncStorage vs SecureStore, WebView injection, OWASP Mobile Top 10."
---

# Security Audit

Skill do przeprowadzania systematycznego audytu bezpieczenstwa w projekcie **Expo SDK 54 / React Native + Supabase + Edge Functions**.

## Kiedy Uzywac

- Review bezpieczenstwa przed deployem na produkcje
- Dodawanie nowych endpointow (API routes, Edge Functions)
- Zmiany w autentykacji lub autoryzacji (auth/authz)
- Tworzenie nowych tabel w bazie danych (RLS policies)
- Praca z danymi uzytkownikow (PII, GDPR)
- Pre-deploy audit po wiekszych zmianach
- Podejrzenie o luke bezpieczenstwa w istniejacym kodzie

---

## Workflow -- 6-skanowy protokol

### Krok 1: Input Validation

Znajdz wszystkie punkty wejscia danych od uzytkownika i zweryfikuj walidacje.

1. **Zmapuj punkty wejscia:**
   - Form actions (React Hook Form + Zod) — z `<TextInput>`
   - API routes / Edge Functions (`req.json()`, `req.text()`, query params)
   - URL parameters (`expo-router` `useLocalSearchParams`, dynamic route segments)
   - Deep linki (`Linking.parse(url)`, scheme `sleeper://...`) — KRYTYCZNE: walidacja schema + host
   - File uploads (`expo-image-picker`, `expo-document-picker`)
   - QR code (jeśli używamy) — `expo-barcode-scanner` payload validation
2. **Sprawdz walidacje Zod** na kazdym punkcie wejscia:
   - Czy schemat Zod istnieje?
   - Czy walidacja jest na granicy systemu (nie glebiej)?
   - Czy typy sa restrykcyjne (`z.string().email()`, nie `z.string()`)?
   - Czy sa limity dlugosci (`z.string().max(500)`)?
3. **Szukaj brakujacej walidacji** -- kazdy `req.json()` bez Zod parse to finding.

### Krok 2: SQL/Query Safety

Supabase query builder jest domyslnie parametryzowany, ale sa pulapki.

1. **Sprawdz wywolania `.rpc()`** -- czy funkcje PostgreSQL nie konkatenuja stringow w SQL
2. **Sprawdz RLS** na kazdej tabeli:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` -- czy jest?
   - Czy sa policies dla SELECT, INSERT, UPDATE, DELETE?
   - Czy policies uzywaja `(SELECT auth.uid())` (nie `auth.email()`)?
3. **Sprawdz filtry** -- czy zapytania `.from()` maja odpowiednie `.eq()`, `.match()`
4. **Sprawdz `.rpc()` z raw SQL** -- szukaj konkatenacji stringow wewnatrz funkcji PostgreSQL

### Krok 3: XSS / Injection (RN context)

**Uwaga:** React Native NIE MA DOM, więc klasyczne XSS NIE DOTYCZY większości aplikacji. XSS dotyczy TYLKO:

1. **WebView** (`react-native-webview`, `expo-web-browser`):
   - Czy wyswietlamy user-generated content w WebView? Jeśli tak → walidacja HTML, sandbox, `originWhitelist`
   - `injectedJavaScript` z user input → NIE; tylko statyczny JS
2. **Deep linki** (`Linking.openURL(url)` z user input):
   - Walidacja `scheme` (`https://` only, lub explicit whitelist)
   - Blokowanie `javascript:`, `file:`, `data:` schemas
3. **Markdown/Rich text rendering** (`react-native-markdown-display`, `react-native-render-html`):
   - Czy sanityzacja jest aktywna? (`react-native-render-html` ma `defaultTextProps`, sanitize)
   - Linki w markdown → walidacja URL przed `Linking.openURL`
4. **Sleeper MVP**: brak WebView, brak markdown — **XSS NIE DOTYCZY**. Sprawdzaj tylko gdy dojdzie deep link handling lub WebView.

### Krok 4: Auth/Authz Audit

Zmapuj endpointy vs wymagania autoryzacji.

1. **Stworz macierz dostepu:**

| Endpoint / Akcja | Anon | Authenticated | Owner | Admin |
|-------------------|------|---------------|-------|-------|
| GET /posts        | tak  | tak           | tak   | tak   |
| POST /posts       | nie  | tak           | -     | tak   |
| DELETE /posts/:id | nie  | nie           | tak   | tak   |

2. **Zweryfikuj RLS policies** -- czy odzwierciedlaja macierz dostepu
3. **Edge Functions JWT** -- czy kazda chroniona funkcja wywoluje `supabase.auth.getUser()`?
4. **Sprawdz `getSession()` vs `getUser()`** -- `getSession()` nie weryfikuje tokena server-side
5. **Sprawdz role-based access** -- czy nie ma hardcoded email/ID w logice autoryzacji

### Krok 5: Sensitive Data Exposure

Szukaj wyciekow danych wrazliwych.

1. **Hardcoded secrets:**
   - Szukaj: API keys, tokeny, hasla w kodzie zrodlowym
   - Sprawdz `.env.example` -- czy nie zawiera prawdziwych wartosci
   - Sprawdz git history -- `git log --diff-filter=A -- "*.env*"`
2. **Dane w logach:**
   - `console.log` / `console.error` z obiektami user/session/error
   - Struktury bledow Supabase wyciekaja info o schemacie DB
3. **Service role key:**
   - Czy `SUPABASE_SERVICE_ROLE_KEY` jest TYLKO w Edge Functions (Supabase Dashboard secrets)?
   - Czy NIE jest w `EXPO_PUBLIC_*` env vars? (EXPO_PUBLIC_* jest **publiczne** — bundle'owane do app!)
   - Czy NIE jest w `Constants.expoConfig.extra` jeśli ma być sekretny?
4. **Token storage (Mobile-specific):**
   - Supabase session token w AsyncStorage — OK dla MVP (iOS Keychain backing dla AsyncStorage)
   - Biometric secret / PIN → MUSI być w `expo-secure-store` (Keychain iOS, Keystore Android — hardware-backed)
   - Encryption keys → ZAWSZE `expo-secure-store`
5. **Screenshot blur (wrażliwe ekrany):**
   - `expo-screen-capture` — `preventScreenCaptureAsync()` na ekranach z hasłem/2FA
   - W background app preview: `expo-screen-capture` `addScreenshotListener` lub flag `<View pointerEvents="none">` na background
4. **PII w Sentry:**
   - Czy `captureException` nie wysyla danych osobowych?
   - Czy `beforeSend` filtruje wrazliwe dane?
5. **Odpowiedzi API:**
   - Czy endpointy nie zwracaja wiecej danych niz potrzeba? (`select('*')` vs `select('id, name')`)

### Krok 6: OWASP Top 10 + Mobile Top 10 Compliance

Przejdz kazda kategorie OWASP Top 10 (2021) **i OWASP Mobile Top 10 (M1-M10)** pod katem naszego stacku.

**Mobile-specific OWASP (M-kategorie):**
- **M1: Improper Credential Usage** — token storage (AsyncStorage vs SecureStore)
- **M2: Inadequate Supply Chain Security** — `npm audit`, `expo doctor`, dependency pinning
- **M3: Insecure Authentication** — OAuth flow walidacja, session timeout
- **M4: Insufficient Input/Output Validation** — deep link params, file picker results
- **M5: Insecure Communication** — `fetch` z `https://` only, certificate pinning (rzadko w MVP)
- **M6: Inadequate Privacy Controls** — Sentry email masking, breadcrumbs review
- **M7: Insufficient Binary Protections** — release builds (`eas build --profile production`) z code obfuscation; jailbreak detection (rzadko w MVP)
- **M8: Security Misconfiguration** — `app.config.ts` review (uprawnienia, plugin config)
- **M9: Insecure Data Storage** — patrz Krok 5 punkt 4
- **M10: Insufficient Cryptography** — używamy Supabase + standard JWT (OK)

Pelne mapowanie kategorii:
**[Przewodnik: resources/owasp-react-supabase.md](resources/owasp-react-supabase.md)**

### Krok 7: Deep Link & WebView Validation (mobile-specific)

1. **Deep link scheme** (`app.json` `scheme: "sleeper"`):
   - Czy walidujemy `host` i `path` przed actionem? (`Linking.parse(url)` zwraca `hostname`, `path`, `queryParams`)
   - Czy fallback jest bezpieczny (`/` zamiast crash) gdy `host` jest unexpected?
   - Universal Links / App Links (iOS apple-app-site-association, Android assetlinks.json) — jeśli używamy: walidacja domeny po stronie OS, bezpieczne
2. **WebView** (jeśli używamy):
   - `originWhitelist={['https://*.our-domain.com']}` — restrykcja origin
   - `javaScriptEnabled={true}` tylko gdy wymagane
   - `injectedJavaScript` TYLKO statyczny — nigdy z user input
   - `onShouldStartLoadWithRequest` — walidacja URL przed nawigacją w WebView
3. **Sleeper MVP**: brak WebView, deep linki tylko dla OAuth callback (`sleeper://auth/callback`) — walidacja w `app/auth/callback.tsx` przed `exchangeCodeForSession`.

---

## Klasyfikacja Findings

```
CRITICAL -- Exploit mozliwy w produkcji, wymaga natychmiastowej naprawy
   Przyklady: RLS wylaczone na tabeli z PII, service_role key na froncie,
   SQL injection w .rpc(), brak auth na endpoincie z danymi

HIGH -- Powazna luka, exploit mozliwy przy okreslonych warunkach
   Przyklady: brak walidacji inputow na Edge Function, XSS przez
   niebezpieczne renderowanie HTML z user content, getSession() do autoryzacji server-side

MEDIUM -- Potencjalne ryzyko, wymaga analizy kontekstu
   Przyklady: brak rate limiting, zbyt szerokie CORS, select('*') zamiast
   konkretnych kolumn, brak CSP headers

LOW -- Hardening, defense-in-depth
   Przyklady: brak Strict-Transport-Security header, outdated dependencies
   bez znanych CVE, brak audit logging dla niekrytycznych operacji
```

---

## Format Raportu

```markdown
## Security Audit Report: [nazwa projektu / scope]

### Executive Summary
[1-3 zdania: ogolna ocena bezpieczenstwa, liczba findings, najwazniejsze ryzyka]

### Findings

#### CRITICAL
1. **[plik:linia]** -- [tytul]
   - Impact: [co moze sie stac]
   - Remediation: [jak naprawic, z przykladem kodu]

#### HIGH
[jak wyzej]

#### MEDIUM
[jak wyzej]

#### LOW
[jak wyzej]

### Risk Matrix

| Kategoria          | Status | Findings |
|--------------------|--------|----------|
| Input Validation   | [OK/WARN/FAIL] | X |
| SQL/Query Safety   | [OK/WARN/FAIL] | X |
| XSS                | [OK/WARN/FAIL] | X |
| Auth/Authz         | [OK/WARN/FAIL] | X |
| Data Exposure      | [OK/WARN/FAIL] | X |
| OWASP Compliance   | [OK/WARN/FAIL] | X |

### Remediation Roadmap
1. [CRITICAL] [opis] -- termin: natychmiast
2. [HIGH] [opis] -- termin: przed deployem
3. [MEDIUM] [opis] -- termin: nastepny sprint
4. [LOW] [opis] -- termin: backlog
```

---

## Zasady

1. **Mysl jak atakujacy** -- zakladaj najgorszy scenariusz, nie optymistyczny
2. **Worst-case scenario** -- kazdy finding opisuj przez pryzmat "co najgorszego moze sie stac"
3. **Zawsze podawaj rozwiazanie** -- finding bez remediation jest bezuzyteczny
4. **Nie dismissuj jako pre-existing** -- istniejace luki sa nadal lukami
5. **Weryfikuj, nie zakladaj** -- "Supabase domyslnie to robi" nie wystarczy, sprawdz konfiguracje
6. **Najmniejsze uprawnienia** -- kazdy komponent powinien miec minimum potrzebnych uprawnien
7. **Defense in depth** -- jedna warstwa ochrony to za malo, waliduj na kazdej granicy
8. **Dokumentuj scope** -- jasno okresl co zostalo sprawdzone, a co nie

---

## Dokumentacja Referencyjna

- **OWASP Top 10 dla naszego stacku** -- `resources/owasp-react-supabase.md`
- **Wzorce auth i bezpieczenstwa** -- `resources/auth-security-patterns.md`
